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
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.*

object ApiClient {
    private val client: OkHttpClient by lazy {
        try {
            val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
                override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
            })

            val sslContext = SSLContext.getInstance("SSL")
            sslContext.init(null, trustAllCerts, SecureRandom())
            val sslSocketFactory = sslContext.socketFactory

            OkHttpClient.Builder()
                .sslSocketFactory(sslSocketFactory, trustAllCerts[0] as X509TrustManager)
                .hostnameVerifier { _, _ -> true }
                .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .build()
        } catch (e: Exception) {
            OkHttpClient.Builder()
                .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
                .writeTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .build()
        }
    }
    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    fun getBaseUrl(context: Context): String {
        val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "ws://10.10.1.219:3000/jarvis/stream")!!
        
        var isHttps = false
        var host = "10.10.1.219"
        
        try {
            val uri = Uri.parse(serverUrl)
            val scheme = uri.scheme
            if (scheme != null) {
                isHttps = scheme.equals("wss", ignoreCase = true) || scheme.equals("https", ignoreCase = true)
            }
            val extractedHost = uri.host
            if (extractedHost != null) {
                host = extractedHost
            }
        } catch (e: Exception) {
            // Fallback
        }

        return if (isHttps) {
            "https://$host:13210"
        } else {
            "http://$host:13210"
        }
    }

    fun getToken(context: Context): String {
        val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
        return prefs.getString("gateway_token", "35c6ae8e7a685718dfb4a45a1f2982d5")!!
    }

    private fun buildRequest(context: Context, path: String, method: String = "GET", body: RequestBody? = null): Request {
        val baseUrl = getBaseUrl(context)
        val token = getToken(context)
        
        // Append token query param or use Authorization header
        val url = "$baseUrl$path?token=$token"
        
        val builder = Request.Builder()
            .url(url)
            .addHeader("Authorization", "Bearer $token")
            .addHeader("Accept", "application/json")
        
        if (method == "POST" && body != null) {
            builder.post(body)
        } else if (method == "DELETE") {
            builder.delete()
        } else if (method == "PUT" && body != null) {
            builder.put(body)
        }
        
        return builder.build()
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

    // --- Agent Mesh Real API Methods ---
    fun getMeshStatus(context: Context, callback: (JSONObject?, Exception?) -> Unit) {
        val request = buildRequest(context, "/api/agent-mesh/status", "GET")
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
        val request = buildRequest(context, "/api/agent-mesh/events?limit=20", "GET")
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
        val payload = JSONObject().apply { put("target", target) }.toString()
        val body = payload.toRequestBody(JSON_MEDIA_TYPE)
        val request = buildRequest(context, "/api/agent-mesh/smoke-tests", "POST", body)

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
}
