package com.jarvis

import android.content.Context
import android.net.Uri
import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.UUID

object ApiClient {
    private const val PREFS_NAME = "JarvisPrefs"
    private const val DEFAULT_HOST_PROTOCOL = "http"
    private const val DEFAULT_HOST_ADDRESS = "100.82.149.22"
    private const val DEFAULT_HOST_PORT = 13210
    private const val DEFAULT_STREAM_URL = "ws://100.82.149.22:3000/jarvis/stream"
    const val EMULATOR_HOST_API_URL = "http://10.0.2.2:13210"

    val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
            .writeTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
            .build()
    }
    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    private fun normalizeHostApiUrl(rawUrl: String?): String {
        val fallback = "$DEFAULT_HOST_PROTOCOL://$DEFAULT_HOST_ADDRESS:$DEFAULT_HOST_PORT"
        val trimmed = rawUrl?.trim().orEmpty()
        if (trimmed.isEmpty()) return fallback

        val withScheme = if (trimmed.contains("://")) trimmed else "$DEFAULT_HOST_PROTOCOL://$trimmed"
        val httpUrl = withScheme
            .replace("ws://", "http://")
            .replace("wss://", "https://")

        return try {
            val uri = Uri.parse(httpUrl)
            val scheme = if (uri.scheme.equals("https", ignoreCase = true)) "https" else "http"
            val host = uri.host ?: return fallback
            val port = if (uri.port > 0 && uri.port != 3000) uri.port else DEFAULT_HOST_PORT
            "$scheme://$host:$port"
        } catch (e: Exception) {
            fallback
        }
    }

    fun getBaseUrl(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val explicitHostApiUrl = prefs.getString("host_api_url", null)
        if (!explicitHostApiUrl.isNullOrBlank()) {
            return normalizeHostApiUrl(explicitHostApiUrl)
        }

        return normalizeHostApiUrl(prefs.getString("server_url", DEFAULT_STREAM_URL))
    }

    fun saveHostApiUrl(context: Context, hostUrl: String): String {
        val normalized = normalizeHostApiUrl(hostUrl)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString("host_api_url", normalized)
            .apply()
        return normalized
    }

    fun getDeviceId(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = prefs.getString("android_device_id", null)
        if (!existing.isNullOrBlank()) return existing

        val generated = "android-${UUID.randomUUID()}"
        prefs.edit().putString("android_device_id", generated).apply()
        return generated
    }

    fun getToken(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val pairingToken = prefs.getString("android_pairing_token", "")
        if (!pairingToken.isNullOrBlank()) return pairingToken
        return prefs.getString("gateway_token", "") ?: ""
    }

    fun saveAndroidPairingToken(context: Context, token: String) {
        if (token.isBlank()) return
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString("android_pairing_token", token)
            .putString("android_connection_status", "paired")
            .apply()
    }

    fun buildRequest(context: Context, path: String, method: String = "GET", body: RequestBody? = null): Request {
        val baseUrl = getBaseUrl(context).trimEnd('/')
        val token = getToken(context)
        val cleanPath = if (path.startsWith("/")) path else "/$path"
        
        val builder = Request.Builder()
            .url("$baseUrl$cleanPath")
            .addHeader("Accept", "application/json")

        if (token.isNotBlank()) {
            builder.addHeader("Authorization", "Bearer $token")
        }
        
        when (method.uppercase()) {
            "POST" -> builder.post(body ?: "{}".toRequestBody(JSON_MEDIA_TYPE))
            "DELETE" -> builder.delete()
            "PUT" -> builder.put(body ?: "{}".toRequestBody(JSON_MEDIA_TYPE))
        }
        
        return builder.build()
    }

    private fun enqueueJsonObject(request: Request, callback: (JSONObject?, Exception?) -> Unit) {
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    callback(JSONObject(responseStr), null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun getAndroidStatus(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        enqueueJsonObject(buildRequest(context, "/api/android/status"), callback)
    }

    fun getAndroidBoard(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        enqueueJsonObject(buildRequest(context, "/api/android/board"), callback)
    }

    fun getAndroidAgents(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        enqueueJsonObject(buildRequest(context, "/api/android/agents"), callback)
    }

    fun getAndroidTasks(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        enqueueJsonObject(buildRequest(context, "/api/android/tasks"), callback)
    }

    fun pairAndroid(context: Context, code: String, deviceName: String, callback: (JSONObject?, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("code", code.trim())
            put("deviceName", deviceName.trim().ifEmpty { "NiClaw Android Companion" })
            put("deviceId", getDeviceId(context))
            put("platform", "android")
        }
        val request = Request.Builder()
            .url("${getBaseUrl(context).trimEnd('/')}/api/android/pair")
            .addHeader("Accept", "application/json")
            .post(payload.toString().toRequestBody(JSON_MEDIA_TYPE))
            .build()

        enqueueJsonObject(request) { response, error ->
            if (response != null) {
                val token = response.optString("token", "")
                if (token.isNotBlank()) {
                    saveAndroidPairingToken(context, token)
                }
            }
            callback(response, error)
        }
    }

    fun syncAndroid(context: Context, syncBoard: Boolean, callback: (JSONObject?, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("source", "android-companion")
            put("syncBoard", syncBoard)
        }
        enqueueJsonObject(
            buildRequest(context, "/api/android/sync", "POST", payload.toString().toRequestBody(JSON_MEDIA_TYPE)),
            callback
        )
    }

    fun sendAndroidEvent(context: Context, type: String, payload: JSONObject, callback: (JSONObject?, Exception?) -> Unit) {
        val eventPayload = JSONObject().apply {
            put("type", type)
            put("source", "android-companion")
            put("payload", payload)
        }
        enqueueJsonObject(
            buildRequest(context, "/api/android/event", "POST", eventPayload.toString().toRequestBody(JSON_MEDIA_TYPE)),
            callback
        )
    }

    fun getAgents(context: Context, callback: (List<JSONObject>?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/agents")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "[]"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    
                    // The gateway can return either a JSON array directly or an object containing the array.
                    // Let's parse appropriately.
                    val agentsList = mutableListOf<JSONObject>()
                    if (responseStr.trim().startsWith("[")) {
                        val array = JSONArray(responseStr)
                        for (i in 0 until array.length()) {
                            agentsList.add(array.getJSONObject(i))
                        }
                    } else {
                        val obj = JSONObject(responseStr)
                        if (obj.has("agents")) {
                            val array = obj.getJSONArray("agents")
                            for (i in 0 until array.length()) {
                                agentsList.add(array.getJSONObject(i))
                            }
                        } else if (obj.has("success") && obj.optBoolean("success")) {
                            // Empty list or generic successful call
                        }
                    }
                    callback(agentsList, null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun createAgent(context: Context, name: String, role: String, description: String, callback: (Boolean, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("name", name)
            val options = JSONObject().apply {
                put("role", role)
                put("description", description)
                put("inheritWorkspace", true)
            }
            put("options", options)
        }
        
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/agents", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                val respStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error creating agent: $respStr"))
                }
            }
        })
    }

    fun deleteAgent(context: Context, id: String, callback: (Boolean, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/agents/$id", "DELETE")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                val respStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error deleting agent: $respStr"))
                }
            }
        })
    }

    fun updateAgent(context: Context, id: String, name: String, role: String, description: String, callback: (Boolean, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("name", name)
            put("role", role)
            put("description", description)
        }
        
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/agents/$id", "PUT", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                val respStr = response.body?.string() ?: ""
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error updating agent: $respStr"))
                }
            }
        })
    }

    fun restartGateway(context: Context, callback: (Boolean, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("restart", true)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/gateway/restart", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error restarting gateway: code ${response.code}"))
                }
            }
        })
    }

    fun fetchLogs(context: Context, callback: (String?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/logs")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: ""
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val obj = JSONObject(responseStr)
                    val content = obj.optString("content", "(No content)")
                    callback(content, null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun runDoctor(context: Context, mode: String, callback: (String?, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("mode", mode)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/app/openclaw-doctor", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: ""
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val obj = JSONObject(responseStr)
                    val stdout = obj.optString("stdout", "")
                    val stderr = obj.optString("stderr", "")
                    val error = obj.optString("error", "")
                    
                    val report = StringBuilder()
                    if (stdout.isNotEmpty()) report.append("=== STDOUT ===\n").append(stdout).append("\n")
                    if (stderr.isNotEmpty()) report.append("=== STDERR ===\n").append(stderr).append("\n")
                    if (error.isNotEmpty()) report.append("=== ERROR ===\n").append(error).append("\n")
                    if (report.isEmpty()) report.append("Doctor finalizat cu succes fără output.")
                    
                    callback(report.toString(), null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun getChannels(context: Context, callback: (JSONArray?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/channels/accounts")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val obj = JSONObject(responseStr)
                    val channelsArray = obj.optJSONArray("channels")
                    callback(channelsArray, null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun toggleChannel(context: Context, channelType: String, enabled: Boolean, callback: (Boolean, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("channelType", channelType)
            put("enabled", enabled)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/channels/config/enabled", "PUT", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        callback(true, null)
                    } else {
                        callback(false, Exception("Error code: ${response.code}, msg: $responseStr"))
                    }
                } catch (e: Exception) {
                    callback(false, e)
                }
            }
        })
    }

    fun getBoardStatus(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/board/status")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    callback(JSONObject(responseStr), null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun syncBoard(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("source", "android")
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/board/sync", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    callback(JSONObject(responseStr), null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun getPlans(context: Context, callback: (List<JSONObject>?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/plans")
        Log.d("ApiClient", "getPlans: requesting GET /api/plans")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "getPlans failure: ${e.message}", e)
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    Log.d("ApiClient", "getPlans response code=${response.code} bodyLength=${responseStr.length}")
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val obj = JSONObject(responseStr)
                    val plansList = mutableListOf<JSONObject>()
                    if (obj.has("plans")) {
                        val array = obj.getJSONArray("plans")
                        for (i in 0 until array.length()) {
                            plansList.add(array.getJSONObject(i))
                        }
                    }
                    callback(plansList, null)
                } catch (e: Exception) {
                    Log.e("ApiClient", "getPlans parsing exception: ${e.message}", e)
                    callback(null, e)
                }
            }
        })
    }

    fun runPlan(context: Context, planId: String, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/plans/${Uri.encode(planId)}/run", "POST", "".toRequestBody(JSON_MEDIA_TYPE))
        Log.d("ApiClient", "runPlan: requesting POST /api/plans/$planId/run")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "runPlan failure: ${e.message}", e)
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    Log.d("ApiClient", "runPlan response code=${response.code} body=$responseStr")
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    callback(JSONObject(responseStr), null)
                } catch (e: Exception) {
                    Log.e("ApiClient", "runPlan parsing exception: ${e.message}", e)
                    callback(null, e)
                }
            }
        })
    }

    fun approvePlanStep(context: Context, planId: String, stepId: String, action: String, callback: (Boolean, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("action", action)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(
            context, 
            "/api/plans/${Uri.encode(planId)}/steps/${Uri.encode(stepId)}/approval", 
            "POST", 
            requestBody
        )
        Log.d("ApiClient", "approvePlanStep: requesting POST /api/plans/$planId/steps/$stepId/approval action=$action")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "approvePlanStep failure: ${e.message}", e)
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                val respStr = response.body?.string() ?: ""
                Log.d("ApiClient", "approvePlanStep response code=${response.code} body=$respStr")
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error setting approval: $respStr"))
                }
            }
        })
    }

    fun createPlan(
        context: Context,
        title: String,
        objective: String,
        steps: JSONArray,
        callback: (Boolean, Exception?) -> Unit
    ) {
        val payload = JSONObject().apply {
            put("title", title)
            put("objective", objective)
            put("steps", steps)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/plans", "POST", requestBody)
        Log.d("ApiClient", "createPlan: requesting POST /api/plans title=$title objective=$objective")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "createPlan failure: ${e.message}", e)
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                val respStr = response.body?.string() ?: ""
                Log.d("ApiClient", "createPlan response code=${response.code} body=$respStr")
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error creating plan: $respStr"))
                }
            }
        })
    }

    fun toggleAgentPause(
        context: Context,
        agentId: String,
        paused: Boolean,
        callback: (Boolean, Exception?) -> Unit
    ) {
        val payload = JSONObject().apply {
            put("paused", paused)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/agents/${Uri.encode(agentId)}", "PUT", requestBody)
        Log.d("ApiClient", "toggleAgentPause: requesting PUT /api/agents/$agentId paused=$paused")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "toggleAgentPause failure: ${e.message}", e)
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                val respStr = response.body?.string() ?: ""
                Log.d("ApiClient", "toggleAgentPause response code=${response.code} body=$respStr")
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error updating agent pause: $respStr"))
                }
            }
        })
    }

    fun getGatewayHealth(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/gateway/health?probe=1")
        Log.d("ApiClient", "getGatewayHealth: requesting GET /api/gateway/health?probe=1")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "getGatewayHealth failure: ${e.message}", e)
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    Log.d("ApiClient", "getGatewayHealth response code=${response.code}")
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    callback(JSONObject(responseStr), null)
                } catch (e: Exception) {
                    Log.e("ApiClient", "getGatewayHealth parsing exception: ${e.message}", e)
                    callback(null, e)
                }
            }
        })
    }

    fun getOrchestratorHealth(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/orchestrator/health")
        Log.d("ApiClient", "getOrchestratorHealth: requesting GET /api/orchestrator/health")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "getOrchestratorHealth failure: ${e.message}", e)
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    Log.d("ApiClient", "getOrchestratorHealth response code=${response.code}")
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    callback(JSONObject(responseStr), null)
                } catch (e: Exception) {
                    Log.e("ApiClient", "getOrchestratorHealth parsing exception: ${e.message}", e)
                    callback(null, e)
                }
            }
        })
    }

    fun getTasks(context: Context, callback: (List<JSONObject>?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/tasks")
        Log.d("ApiClient", "getTasks: requesting GET /api/tasks")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "getTasks failure: ${e.message}", e)
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    Log.d("ApiClient", "getTasks response code=${response.code} bodyLength=${responseStr.length}")
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val obj = JSONObject(responseStr)
                    val tasksList = mutableListOf<JSONObject>()
                    if (obj.has("tasks")) {
                        val array = obj.getJSONArray("tasks")
                        for (i in 0 until array.length()) {
                            tasksList.add(array.getJSONObject(i))
                        }
                    }
                    callback(tasksList, null)
                } catch (e: Exception) {
                    Log.e("ApiClient", "getTasks parsing exception: ${e.message}", e)
                    callback(null, e)
                }
            }
        })
    }

    fun createTask(
        context: Context,
        title: String,
        description: String,
        status: String,
        callback: (Boolean, Exception?) -> Unit
    ) {
        val payload = JSONObject().apply {
            put("title", title)
            put("description", description)
            put("status", status)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/tasks", "POST", requestBody)
        Log.d("ApiClient", "createTask: requesting POST /api/tasks title=$title status=$status")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "createTask failure: ${e.message}", e)
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                val respStr = response.body?.string() ?: ""
                Log.d("ApiClient", "createTask response code=${response.code} body=$respStr")
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error creating task: $respStr"))
                }
            }
        })
    }

    fun updateTaskStatus(
        context: Context,
        taskId: String,
        status: String,
        callback: (Boolean, Exception?) -> Unit
    ) {
        val payload = JSONObject().apply {
            put("status", status)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/tasks/${Uri.encode(taskId)}", "PUT", requestBody)
        Log.d("ApiClient", "updateTaskStatus: requesting PUT /api/tasks/$taskId status=$status")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "updateTaskStatus failure: ${e.message}", e)
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                val respStr = response.body?.string() ?: ""
                Log.d("ApiClient", "updateTaskStatus response code=${response.code} body=$respStr")
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error updating task status: $respStr"))
                }
            }
        })
    }

    fun deleteTask(
        context: Context,
        taskId: String,
        callback: (Boolean, Exception?) -> Unit
    ) {
        val request = buildRequest(context, "/api/tasks/${Uri.encode(taskId)}", "DELETE")
        Log.d("ApiClient", "deleteTask: requesting DELETE /api/tasks/$taskId")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("ApiClient", "deleteTask failure: ${e.message}", e)
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                val respStr = response.body?.string() ?: ""
                Log.d("ApiClient", "deleteTask response code=${response.code} body=$respStr")
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error deleting task: $respStr"))
                }
            }
        })
    }

    fun getCronJobs(context: Context, callback: (JSONArray?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/cron/jobs")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "[]"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val array = JSONArray(responseStr)
                    callback(array, null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun toggleCronJob(context: Context, id: String, enabled: Boolean, callback: (Boolean, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("id", id)
            put("enabled", enabled)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/cron/toggle", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error code: ${response.code}"))
                }
            }
        })
    }

    fun triggerCronJob(context: Context, id: String, callback: (Boolean, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("id", id)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/cron/trigger", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error code: ${response.code}"))
                }
            }
        })
    }

    fun getSkillsQuickAccess(context: Context, callback: (JSONArray?, Exception?) -> Unit) {
        val payload = JSONObject()
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/skills/quick-access", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val obj = JSONObject(responseStr)
                    val array = obj.optJSONArray("skills") ?: JSONArray()
                    callback(array, null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun toggleSkill(context: Context, skillKey: String, enabled: Boolean, callback: (Boolean, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("skillKey", skillKey)
            put("enabled", enabled)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/skills/toggle", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error code: ${response.code}"))
                }
            }
        })
    }

    fun getProviderAccounts(context: Context, callback: (JSONArray?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/provider-accounts")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "[]"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val array = JSONArray(responseStr)
                    callback(array, null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun getProviderVendors(context: Context, callback: (JSONArray?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/provider-vendors")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "[]"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val array = JSONArray(responseStr)
                    callback(array, null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun getDefaultProviderAccount(context: Context, callback: (String?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/provider-accounts/default")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val obj = JSONObject(responseStr)
                    val accountId = if (obj.isNull("accountId")) null else obj.optString("accountId")
                    callback(accountId, null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun setDefaultProviderAccount(context: Context, accountId: String, callback: (Boolean, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("accountId", accountId)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/provider-accounts/default", "PUT", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error code: ${response.code}"))
                }
            }
        })
    }

    fun toggleProviderAccount(context: Context, accountId: String, enabled: Boolean, callback: (Boolean, Exception?) -> Unit) {
        val updates = JSONObject().apply {
            put("enabled", enabled)
        }
        val payload = JSONObject().apply {
            put("updates", updates)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/provider-accounts/${Uri.encode(accountId)}", "PUT", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e)
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("Error code: ${response.code}"))
                }
            }
        })
    }

    fun gatewayRpc(
        context: Context,
        method: String,
        params: JSONObject?,
        timeoutMs: Int = 30000,
        callback: (JSONObject?, Exception?) -> Unit
    ) {
        val payload = JSONObject().apply {
            put("method", method)
            put("params", params ?: JSONObject())
            put("timeoutMs", timeoutMs)
        }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/gateway/rpc", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val obj = JSONObject(responseStr)
                    if (obj.optBoolean("success", false)) {
                        callback(obj, null)
                    } else {
                        callback(null, Exception(obj.optString("error", "RPC failed")))
                    }
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    // ── Obsidian Second Brain ────────────────────────────────────────────────

    fun obsidianStatus(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/obsidian/status")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun obsidianBrowse(context: Context, path: String, callback: (JSONObject?, Exception?) -> Unit) {
        val encodedPath = Uri.encode(path)
        val request = buildRequest(context, "/api/obsidian/browse?path=$encodedPath")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun obsidianRead(context: Context, path: String, callback: (JSONObject?, Exception?) -> Unit) {
        val encodedPath = Uri.encode(path)
        val request = buildRequest(context, "/api/obsidian/read?path=$encodedPath")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun obsidianSearch(context: Context, query: String, callback: (JSONObject?, Exception?) -> Unit) {
        val payload = JSONObject().apply { put("query", query) }
        val requestBody = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/obsidian/search", "POST", requestBody)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun obsidianToday(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/obsidian/today")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun obsidianRecentJournals(context: Context, limit: Int = 5, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/obsidian/recent-journals?limit=$limit")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getSessionSummaries(context: Context, agentId: String, sessionKeys: JSONArray?, callback: (JSONObject?, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("sessionKeys", sessionKeys ?: JSONArray())
        }
        val request = buildRequest(context, "/api/sessions/summaries", "POST", payload.toString().toRequestBody(JSON_MEDIA_TYPE))
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getSessionTranscript(context: Context, sessionKey: String?, agentId: String?, sessionId: String?, limit: Int = 200, callback: (JSONObject?, Exception?) -> Unit) {
        val queryParams = mutableListOf("limit=$limit")
        sessionKey?.let { queryParams.add("sessionKey=$it") }
        agentId?.let { queryParams.add("agentId=$it") }
        sessionId?.let { queryParams.add("sessionId=$it") }
        val queryString = queryParams.joinToString("&")

        val request = buildRequest(context, "/api/sessions/transcript?$queryString")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun deleteSession(context: Context, sessionKey: String, callback: (JSONObject?, Exception?) -> Unit) {
        val payload = JSONObject().apply { put("sessionKey", sessionKey) }
        val request = buildRequest(context, "/api/sessions/delete", "POST", payload.toString().toRequestBody(JSON_MEDIA_TYPE))
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun renameSession(context: Context, sessionKey: String, label: String, callback: (JSONObject?, Exception?) -> Unit) {
        val payload = JSONObject().apply {
            put("sessionKey", sessionKey)
            put("label", label)
        }
        val request = buildRequest(context, "/api/sessions/rename", "POST", payload.toString().toRequestBody(JSON_MEDIA_TYPE))
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getUsageHistory(context: Context, limit: Int?, callback: (JSONObject?, Exception?) -> Unit) {
        val query = if (limit != null) "?limit=$limit" else ""
        val request = buildRequest(context, "/api/usage/recent-token-history$query")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getSessionsList(context: Context, agentId: String, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/sessions/list?agentId=$agentId")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun postDreamSignal(context: Context, payload: JSONObject, callback: (JSONObject?, Exception?) -> Unit) {
        val body = payload.toString().toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/dreams/signals", "POST", body)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getDreamInsights(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/dreams/insights")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getDreamDiary(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/dreams/diary")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun postDreamRun(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val body = "{}".toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/dreams/run", "POST", body)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getDreamQueue(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/dreams/queue")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getDreamGraph(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/dreams/graph")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun postDreamQueueApprove(context: Context, id: String, callback: (JSONObject?, Exception?) -> Unit) {
        val body = "{}".toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/dreams/queue/$id/approve", "POST", body)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun postDreamQueueReject(context: Context, id: String, callback: (JSONObject?, Exception?) -> Unit) {
        val body = "{}".toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/dreams/queue/$id/reject", "POST", body)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getDreamPromotions(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/dreams/promotions")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun postDreamPromotionRun(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val body = "{}".toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/dreams/promotions/run", "POST", body)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun postDreamPromotionAccept(context: Context, id: String, callback: (JSONObject?, Exception?) -> Unit) {
        val body = "{}".toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/dreams/promotions/$id/accept", "POST", body)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun postDreamPromotionReject(context: Context, id: String, callback: (JSONObject?, Exception?) -> Unit) {
        val body = "{}".toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/dreams/promotions/$id/reject", "POST", body)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    // --- Agent Mesh API Methods ---
    fun getMeshStatus(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/agent-mesh/status")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getMeshEvents(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/mesh/events?limit=20")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun runMeshSmokeTest(context: Context, target: String, callback: (JSONObject?, Exception?) -> Unit) {
        val body = """{"target":"$target"}""".toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/agent-mesh/smoke-test", "POST", body)
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    // Dev Command Center Hooks (Routed natively via Host API)
    fun getCommandCenterStatus(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/command-center/status")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getCommandCenterProjects(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/command-center/projects")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getCommandCenterTasks(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/command-center/tasks")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    fun getCommandCenterReports(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/command-center/reports")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(null, e) }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "{}"
                    if (!response.isSuccessful) { callback(null, Exception("${response.code}: $s")); return }
                    callback(JSONObject(s), null)
                } catch (e: Exception) { callback(null, e) }
            }
        })
    }

    // --- Models & Agent Editor API ---
    fun getAvailableModels(context: Context, callback: (JSONArray?, Exception?) -> Unit) {
        // Fallback models in case API fails
        val fallbackModels = JSONArray().apply { put("gpt-4o"); put("claude-3-opus"); put("local-model") }

        // According to user, Hermes models are at http://vm-niclaw.tail7a9097.ts.net:7789/models
        // However we should use the Host API proxy. Let's try /api/models first.
        val request = buildRequest(context, "/api/models")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { 
                android.util.Log.e("ApiClient", "getAvailableModels err", e)
                callback(fallbackModels, null) 
            }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val s = response.body?.string() ?: "[]"
                    if (!response.isSuccessful) { 
                        android.util.Log.e("ApiClient", "getAvailableModels HTTP ${response.code}")
                        callback(fallbackModels, null)
                        return 
                    }
                    
                    if (s.startsWith("{")) {
                        val obj = JSONObject(s)
                        if (obj.has("models")) {
                            callback(obj.optJSONArray("models"), null)
                        } else {
                            val arr = JSONArray()
                            obj.keys().forEach { arr.put(it) }
                            callback(arr, null)
                        }
                    } else if (s.startsWith("[")) {
                        callback(JSONArray(s), null)
                    } else {
                        callback(fallbackModels, null)
                    }
                } catch (e: Exception) { 
                    android.util.Log.e("ApiClient", "getAvailableModels parsing err", e)
                    callback(fallbackModels, null) 
                }
            }
        })
    }

    fun getModels(context: Context, callback: (JSONArray?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/models")
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(null, e)
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val responseStr = response.body?.string() ?: "[]"
                    if (!response.isSuccessful) {
                        callback(null, Exception("Error code: ${response.code}, msg: $responseStr"))
                        return
                    }
                    val obj = JSONObject(responseStr)
                    val models = obj.optJSONArray("models") ?: JSONArray()
                    callback(models, null)
                } catch (e: Exception) {
                    callback(null, e)
                }
            }
        })
    }

    fun saveAgentConfig(context: Context, agentData: JSONObject, callback: (Boolean, Exception?) -> Unit) {
        val body = agentData.toString().toRequestBody(JSON_MEDIA_TYPE)
        // Assume /api/agents for POST/PUT based on existing Host API structure
        val id = agentData.optString("id")
        val route = if (id.isNotEmpty()) "/api/agents/$id" else "/api/agents"
        val method = if (id.isNotEmpty()) "PUT" else "POST"
        val request = buildRequest(context, route, method, body) 
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { callback(false, e) }
            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    callback(true, null)
                } else {
                    callback(false, Exception("${response.code}: ${response.body?.string()}"))
                }
            }
        })
    }
}
