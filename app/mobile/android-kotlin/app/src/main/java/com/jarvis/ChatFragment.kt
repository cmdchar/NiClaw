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
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException
class ChatFragment : Fragment() {

    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: MessageAdapter
    private lateinit var textInput: EditText
    private lateinit var sendButton: ImageButton
    private lateinit var btnSessions: ImageButton
    private lateinit var micButton: FloatingActionButton
    private lateinit var chatStatusText: TextView
    private lateinit var statusIndicator: View
    
    // Clarification Banner
    private lateinit var clarificationBanner: View
    private lateinit var btnOpenClarificationTask: android.widget.Button
    private var pendingClarificationTaskId: String? = null
    
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())
    private var isPolling = false
    private val pollRunnable = object : Runnable {
        override fun run() {
            if (isPolling) {
                checkClarificationTasks()
                handler.postDelayed(this, 5000)
            }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_chat, container, false)

        swipeRefresh = view.findViewById(R.id.chatSwipeRefresh)
        recyclerView = view.findViewById(R.id.chatRecyclerView)
        textInput = view.findViewById(R.id.textInput)
        sendButton = view.findViewById(R.id.sendButton)
        val btnCommandCenter: ImageButton = view.findViewById(R.id.btnCommandCenter)
        btnCommandCenter.setOnClickListener {
            val cmdFragment = CommandCenterFragment()
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, cmdFragment)
                .addToBackStack(null)
                .commit()
        }

        val btnSessions: ImageButton = view.findViewById(R.id.btnSessions)
        this.btnSessions = btnSessions
        micButton = view.findViewById(R.id.micButton)
        chatStatusText = view.findViewById(R.id.chatStatusText)
        statusIndicator = view.findViewById(R.id.statusIndicator)

        val mainActivity = activity as? MainActivity

        clarificationBanner = view.findViewById(R.id.clarificationBanner)
        btnOpenClarificationTask = view.findViewById(R.id.btnOpenClarificationTask)
        
        btnOpenClarificationTask.setOnClickListener {
            pendingClarificationTaskId?.let { taskId ->
                android.util.Log.d("TaskNav", "opening taskId=$taskId")
                val taskDetail = TaskDetailFragment.newInstance(taskId)
                parentFragmentManager.beginTransaction()
                    .replace(R.id.fragmentContainer, taskDetail)
                    .addToBackStack(null)
                    .commit()
            }
        }

        // Setup RecyclerView
        adapter = MessageAdapter(mainActivity?.getCachedMessages() ?: mutableListOf()) { option ->
            pendingClarificationTaskId?.let { taskId ->
                val ctx = context ?: return@MessageAdapter
                val reqBody = JSONObject().apply {
                    put("answer", option.label)
                    put("selectedOptionId", option.id)
                }.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                
                val req = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$taskId/clarify", "POST", reqBody)
                ApiClient.client.newCall(req).enqueue(object : Callback {
                    override fun onFailure(call: Call, e: IOException) {
                        activity?.runOnUiThread { Toast.makeText(ctx, "Clarification failed: ${e.message}", Toast.LENGTH_SHORT).show() }
                    }
                    override fun onResponse(call: Call, response: Response) {
                        if (response.isSuccessful) {
                            activity?.runOnUiThread { 
                                pendingClarificationTaskId = null
                                clarificationBanner.visibility = View.GONE
                                val msg = Message(option.label, true)
                                mainActivity?.getCachedMessages()?.add(msg)
                                adapter.notifyItemInserted((mainActivity?.getCachedMessages()?.size ?: 1) - 1)
                                recyclerView.scrollToPosition((mainActivity?.getCachedMessages()?.size ?: 1) - 1)
                            }
                        }
                    }
                })
            }
        }
        recyclerView.layoutManager = LinearLayoutManager(context).apply { stackFromEnd = true }
        recyclerView.adapter = adapter

        // Link adapter back to MainActivity
        mainActivity?.setActiveMessageAdapter(adapter)

        // Setup Send button
        sendButton.setOnClickListener {
            val text = textInput.text.toString().trim()
            if (text.isNotEmpty()) {
                val cacheSize = mainActivity?.getCachedMessages()?.size ?: 1
                val msg = Message(text, true)
                mainActivity?.getCachedMessages()?.add(msg)
                adapter.notifyItemInserted(cacheSize)
                recyclerView.scrollToPosition(cacheSize)
                textInput.text.clear()

                val ctx = context ?: return@setOnClickListener
                if (pendingClarificationTaskId != null) {
                    val reqBody = JSONObject().apply {
                        put("answer", text)
                    }.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                    val req = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$pendingClarificationTaskId/clarify", "POST", reqBody)
                    ApiClient.client.newCall(req).enqueue(object : Callback {
                        override fun onFailure(call: Call, e: IOException) {}
                        override fun onResponse(call: Call, response: Response) {
                            if (response.isSuccessful) {
                                activity?.runOnUiThread {
                                    pendingClarificationTaskId = null
                                    clarificationBanner.visibility = View.GONE
                                }
                            }
                        }
                    })
                } else {
                    val reqBody = JSONObject().apply {
                        put("prompt", text)
                        put("taskType", "auto")
                        put("executor", "auto")
                    }.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
                    val req = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks", "POST", reqBody)
                    ApiClient.client.newCall(req).enqueue(object : Callback {
                        override fun onFailure(call: Call, e: IOException) {
                            activity?.runOnUiThread { Toast.makeText(ctx, "Failed to create task", Toast.LENGTH_SHORT).show() }
                        }
                        override fun onResponse(call: Call, response: Response) {}
                    })
                }
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

        // Setup Swipe Refresh
        swipeRefresh.setOnRefreshListener {
            loadInitialSessions(isManualRefresh = true)
        }

        // Auto-load sessions on open if empty
        if (mainActivity?.getCachedMessages()?.isEmpty() == true) {
            swipeRefresh.isRefreshing = true
            loadInitialSessions()
        }

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
                "Conectat", "Conectat (REST)" -> 0xFF00E5FF.toInt()
                "Deconectat", "Eroare Conexiune" -> 0xFFFF5252.toInt()
                else -> 0xFFFFFFFF.toInt()
            }
            statusIndicator.backgroundTintList = android.content.res.ColorStateList.valueOf(color)
        }
    }

    private fun loadInitialSessions(isManualRefresh: Boolean = false) {
        val ctx = context ?: return
        val mainActivity = activity as? MainActivity ?: return

        ApiClient.getSessionsList(ctx, "default-agent") { response, error ->
            mainActivity.runOnUiThread {
                swipeRefresh.isRefreshing = false
                if (error != null) {
                    if (isManualRefresh) {
                        Toast.makeText(ctx, "Eroare la auto-încărcare sesiuni", Toast.LENGTH_SHORT).show()
                    }
                    return@runOnUiThread
                }
                val sessionsArray = response?.optJSONArray("sessions")
                if (sessionsArray != null && sessionsArray.length() > 0) {
                    val s = sessionsArray.optJSONObject(0)
                    val key = s?.optString("key", "")
                    if (!key.isNullOrEmpty()) {
                        loadSessionTranscript(key)
                    }
                }
            }
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

    override fun onResume() {
        super.onResume()
        isPolling = true
        handler.post(pollRunnable)
    }

    override fun onPause() {
        super.onPause()
        isPolling = false
        handler.removeCallbacks(pollRunnable)
    }

    private fun checkClarificationTasks() {
        val ctx = context ?: return
        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks", "GET")
        
        ApiClient.client.newCall(request).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {}
            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                val body = response.body?.string() ?: return
                try {
                    val json = JSONObject(body)
                    val tasksArray = json.optJSONArray("tasks") ?: org.json.JSONArray()
                    var clarificationTaskId: String? = null
                    
                    for (i in 0 until tasksArray.length()) {
                        val t = tasksArray.optJSONObject(i)
                        if (t?.optString("status") == "waiting_clarification") {
                            clarificationTaskId = t.optString("id")
                            break
                        }
                    }
                    
                    activity?.runOnUiThread {
                        if (clarificationTaskId != null) {
                            pendingClarificationTaskId = clarificationTaskId
                            clarificationBanner.visibility = View.VISIBLE
                        } else {
                            pendingClarificationTaskId = null
                            clarificationBanner.visibility = View.GONE
                        }
                    }
                } catch (e: Exception) {}
            }
        })
    }
}
