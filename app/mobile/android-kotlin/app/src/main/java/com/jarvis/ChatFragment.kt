package com.jarvis

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.ImageButton
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.app.AlertDialog
import android.widget.Toast
import com.google.android.material.floatingactionbutton.FloatingActionButton
import org.json.JSONObject

class ChatFragment : Fragment() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: MessageAdapter
    private lateinit var textInput: EditText
    private lateinit var sendButton: ImageButton
    private lateinit var btnSessions: ImageButton
    private lateinit var micButton: FloatingActionButton
    private lateinit var chatStatusText: TextView
    private lateinit var statusIndicator: View

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_chat, container, false)

        recyclerView = view.findViewById(R.id.chatRecyclerView)
        textInput = view.findViewById(R.id.textInput)
        sendButton = view.findViewById(R.id.sendButton)
        btnSessions = view.findViewById(R.id.btnSessions)
        micButton = view.findViewById(R.id.micButton)
        chatStatusText = view.findViewById(R.id.chatStatusText)
        statusIndicator = view.findViewById(R.id.statusIndicator)

        val mainActivity = activity as? MainActivity

        // Setup RecyclerView
        adapter = MessageAdapter(mainActivity?.getCachedMessages() ?: mutableListOf())
        recyclerView.layoutManager = LinearLayoutManager(context).apply { stackFromEnd = true }
        recyclerView.adapter = adapter

        // Link adapter back to MainActivity
        mainActivity?.setActiveMessageAdapter(adapter)

        // Setup Send button
        sendButton.setOnClickListener {
            val text = textInput.text.toString().trim()
            if (text.isNotEmpty()) {
                mainActivity?.sendMessage(text)
                textInput.text.clear()
            }
        }

        // Setup Speech-to-Text Button
        micButton.setOnClickListener {
            mainActivity?.checkPermissionAndListen()
        }

        // Setup Sessions Button
        btnSessions.setOnClickListener {
            showSessionsDialog()
        }

        // Apply initial status
        mainActivity?.getCurrentStatus()?.let { updateStatus(it) }

        return view
    }

    override fun onDestroyView() {
        super.onDestroyView()
        val mainActivity = activity as? MainActivity
        mainActivity?.setActiveMessageAdapter(null)
    }

    fun updateStatus(status: String) {
        if (!isAdded) return
        activity?.runOnUiThread {
            chatStatusText.text = status
            val color = when (status) {
                "Conectat" -> 0xFF00E5FF.toInt()
                "Deconectat", "Eroare Conexiune" -> 0xFFFF5252.toInt()
                else -> 0xFFFFFFFF.toInt()
            }
            statusIndicator.backgroundTintList = android.content.res.ColorStateList.valueOf(color)
        }
    }

    private fun showSessionsDialog() {
        val ctx = context ?: return
        val mainActivity = activity as? MainActivity ?: return

        Toast.makeText(ctx, "Se încarcă sesiunile...", Toast.LENGTH_SHORT).show()
        ApiClient.getSessionsList(ctx, "default-agent") { response, error ->
            mainActivity.runOnUiThread {
                if (error != null) {
                    Toast.makeText(ctx, "Eroare la încărcare sesiuni: ${error.message}", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }
                if (response == null) return@runOnUiThread

                val sessionsArray = response.optJSONArray("sessions")
                if (sessionsArray == null || sessionsArray.length() == 0) {
                    Toast.makeText(ctx, "Nu s-au găsit sesiuni.", Toast.LENGTH_SHORT).show()
                    return@runOnUiThread
                }

                val sessionKeys = mutableListOf<String>()
                val sessionLabels = mutableListOf<String>()

                for (i in 0 until sessionsArray.length()) {
                    val s = sessionsArray.optJSONObject(i) ?: continue
                    val key = s.optString("key", "")
                    val label = s.optString("label", s.optString("displayName", s.optString("id", key)))
                    if (key.isNotEmpty()) {
                        sessionKeys.add(key)
                        sessionLabels.add(label.ifEmpty { key })
                    }
                }

                val builder = AlertDialog.Builder(ctx)
                builder.setTitle("Istoric Sesiuni")
                builder.setItems(sessionLabels.toTypedArray()) { _, which ->
                    val selectedKey = sessionKeys[which]
                    loadSessionTranscript(selectedKey)
                }
                builder.setNegativeButton("Anulare", null)
                builder.setNeutralButton("Sesiune Nouă") { _, _ ->
                    // Clear messages for a new session
                    mainActivity.getCachedMessages().clear()
                    adapter.notifyDataSetChanged()
                    updateStatus("Sesiune nouă")
                }
                builder.show()
            }
        }
    }

    private fun loadSessionTranscript(sessionKey: String) {
        val ctx = context ?: return
        val mainActivity = activity as? MainActivity ?: return

        Toast.makeText(ctx, "Încărcare transcript...", Toast.LENGTH_SHORT).show()
        ApiClient.getSessionTranscript(ctx, sessionKey, null, null, 200) { response, error ->
            mainActivity.runOnUiThread {
                if (error != null) {
                    Toast.makeText(ctx, "Eroare: ${error.message}", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }
                val messagesArray = response?.optJSONArray("messages")
                if (messagesArray == null) {
                    Toast.makeText(ctx, "Transcript gol.", Toast.LENGTH_SHORT).show()
                    return@runOnUiThread
                }

                val cache = mainActivity.getCachedMessages()
                cache.clear()

                for (i in 0 until messagesArray.length()) {
                    val m = messagesArray.optJSONObject(i) ?: continue
                    val role = m.optString("role", "")
                    val contentObj = m.opt("content")
                    var text = ""

                    if (contentObj is org.json.JSONArray) {
                        for (j in 0 until contentObj.length()) {
                            val block = contentObj.optJSONObject(j) ?: continue
                            if (block.optString("type") == "text") {
                                text += block.optString("text", "")
                            }
                        }
                    } else if (contentObj is String) {
                        text = contentObj
                    }

                    if (text.isNotEmpty()) {
                        cache.add(Message(text, role == "user"))
                    }
                }

                adapter.notifyDataSetChanged()
                recyclerView.scrollToPosition(cache.size - 1)
                updateStatus("Sesiune încărcată")
            }
        }
    }
}
