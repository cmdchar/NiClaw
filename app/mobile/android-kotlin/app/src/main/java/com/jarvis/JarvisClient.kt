package com.jarvis

import android.provider.Settings
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class JarvisClient(private var serverUrl: String, private val activity: MainActivity) {

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .connectTimeout(5, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private var webSocket: WebSocket? = null
    private var currentAiText = StringBuilder()
    private val deviceId: String = Settings.Secure.getString(activity.contentResolver, Settings.Secure.ANDROID_ID)

    init {
        connect()
    }

    fun reconnect(newUrl: String) {
        serverUrl = newUrl
        webSocket?.close(1000, "URL Changed")
        connect()
    }

    private fun connect() {
        val request = Request.Builder().url(serverUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                activity.onStatusUpdate("Conectat")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val data = JSONObject(text)
                    when (data.optString("type")) {
                        "full" -> activity.onJarvisResponse(data)
                        "start" -> {
                            currentAiText = StringBuilder()
                            activity.onStreamingStart()
                        }
                        "chunk" -> {
                            val chunk = data.optString("text")
                            currentAiText.append(chunk)
                            activity.onStreamingChunk(chunk)
                        }
                        "end" -> {
                            val finalResponse = JSONObject()
                            finalResponse.put("text", currentAiText.toString())
                            finalResponse.put("type", "full")
                            activity.onJarvisResponse(finalResponse)
                        }
                        "error" -> {
                            activity.onStatusUpdate("Eroare Server")
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                activity.onStatusUpdate("Deconectat")
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                android.util.Log.e("JarvisClient", "WebSocket failure", t)
                activity.onStatusUpdate("Eroare Conexiune")
            }
        })
    }

    fun sendMessage(text: String) {
        val message = JSONObject()
        message.put("text", text)
        message.put("user_id", deviceId)
        webSocket?.send(message.toString())
    }
}
