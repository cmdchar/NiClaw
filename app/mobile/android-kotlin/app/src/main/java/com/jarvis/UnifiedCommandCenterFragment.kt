package com.jarvis

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

class UnifiedCommandCenterFragment : Fragment() {

    private lateinit var headerLayout: LinearLayout
    private lateinit var statusBadgesLayout: LinearLayout
    private lateinit var btnRefresh: ImageButton
    private lateinit var agentsRecyclerView: RecyclerView
    private lateinit var chatRecyclerView: RecyclerView
    private lateinit var activeTaskContainer: FrameLayout
    private lateinit var tvActiveTaskTitle: TextView
    private lateinit var tvActiveTaskStatus: TextView
    private lateinit var taskTypeSpinner: Spinner
    private lateinit var executorSpinner: Spinner
    private lateinit var etChatInput: EditText
    private lateinit var btnSend: ImageButton

    private lateinit var messageAdapter: MessageAdapter
    private var pendingClarificationTaskId: String? = null
    private var clarificationQuestion: String? = null

    private val handler = Handler(Looper.getMainLooper())
    private var isPolling = false

    private lateinit var agentAdapter: AgentActivityAdapter

    private val pollRunnable = object : Runnable {
        override fun run() {
            if (isPolling) {
                fetchWorkspace()
                handler.postDelayed(this, 2000)
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_unified_command_center, container, false)
        
        statusBadgesLayout = view.findViewById(R.id.statusBadgesLayout)
        btnRefresh = view.findViewById(R.id.btnRefresh)
        agentsRecyclerView = view.findViewById(R.id.agentsRecyclerView)
        chatRecyclerView = view.findViewById(R.id.chatRecyclerView)
        activeTaskContainer = view.findViewById(R.id.activeTaskContainer)
        tvActiveTaskTitle = view.findViewById(R.id.tvActiveTaskTitle)
        tvActiveTaskStatus = view.findViewById(R.id.tvActiveTaskStatus)
        taskTypeSpinner = view.findViewById(R.id.taskTypeSpinner)
        executorSpinner = view.findViewById(R.id.executorSpinner)
        etChatInput = view.findViewById(R.id.etChatInput)
        btnSend = view.findViewById(R.id.btnSend)

        agentsRecyclerView.layoutManager = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false)
        agentAdapter = AgentActivityAdapter(mutableListOf())
        agentsRecyclerView.adapter = agentAdapter
        
        val mainActivity = activity as? MainActivity
        messageAdapter = MessageAdapter(mainActivity?.getCachedMessages() ?: mutableListOf()) { option ->
            pendingClarificationTaskId?.let { taskId ->
                sendClarification(taskId, option.id)
            }
        }
        chatRecyclerView.layoutManager = LinearLayoutManager(context).apply { stackFromEnd = true }
        chatRecyclerView.adapter = messageAdapter
        mainActivity?.setActiveMessageAdapter(messageAdapter)

        val taskTypes = arrayOf("auto", "agent_diagnostics", "project_code_change", "system_health")
        taskTypeSpinner.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, taskTypes)
        
        val executors = arrayOf("auto", "hermes", "remote_claude", "codex", "agent_diagnostics")
        executorSpinner.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, executors)

        btnRefresh.setOnClickListener { fetchWorkspace() }
        btnSend.setOnClickListener { sendPrompt() }

        fetchWorkspace()
        return view
    }

    override fun onDestroyView() {
        super.onDestroyView()
        val mainActivity = activity as? MainActivity
        mainActivity?.setActiveMessageAdapter(null)
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

    private fun fetchWorkspace() {
        val ctx = context ?: return
        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/workspace", "GET")
        
        ApiClient.client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("UnifiedCommandCenter", "fetchWorkspace failed", e)
            }

            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: "{}"
                if (response.isSuccessful) {
                    try {
                        val json = JSONObject(body)
                        activity?.runOnUiThread {
                            updateUI(json)
                        }
                    } catch (e: Exception) {
                        Log.e("UnifiedCommandCenter", "JSON parse error", e)
                    }
                }
            }
        })
    }

    private fun updateUI(data: JSONObject) {
        statusBadgesLayout.removeAllViews()
        val healthArray = data.optJSONArray("health")
        if (healthArray != null) {
            for (i in 0 until healthArray.length()) {
                val h = healthArray.optJSONObject(i)
                val service = h.optString("service")
                val status = h.optString("status")
                val tv = TextView(context).apply {
                    text = "$service: $status"
                    setPadding(16, 8, 16, 8)
                    setTextColor(android.graphics.Color.WHITE)
                    textSize = 12f
                }
                val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                params.setMargins(0, 0, 8, 0)
                statusBadgesLayout.addView(tv, params)
            }
        }
        
        val agentsArray = data.optJSONArray("agentActivity")
        if (agentsArray != null) {
            val list = mutableListOf<JSONObject>()
            for (i in 0 until agentsArray.length()) {
                list.add(agentsArray.optJSONObject(i))
            }
            agentAdapter.updateData(list)
        }

        if (data.has("activeTask") && !data.isNull("activeTask")) {
            val t = data.optJSONObject("activeTask")
            activeTaskContainer.visibility = View.VISIBLE
            tvActiveTaskTitle.text = t.optString("title", "Active Task")
            
            var statusText = "Status: ${t.optString("status")} | Exec: ${t.optString("executor")}"
            val eventsArray = data.optJSONArray("events")
            if (eventsArray != null && eventsArray.length() > 0) {
                val lastEvent = eventsArray.optJSONObject(eventsArray.length() - 1)
                statusText += "\n> ${lastEvent.optString("message")}"
            }
            tvActiveTaskStatus.text = statusText
        } else {
            activeTaskContainer.visibility = View.GONE
        }
        
        val waitingClarifications = data.optJSONArray("waitingClarifications")
        val waitingPatchReviews = data.optJSONArray("waitingPatchReviews")
        
        if (waitingClarifications != null && waitingClarifications.length() > 0) {
            val task = waitingClarifications.optJSONObject(0)
            val newClarificationId = task.optString("id")
            val clarification = task.optJSONObject("clarification")
            val question = clarification?.optString("question") ?: "Waiting for clarification"
            
            if (pendingClarificationTaskId != newClarificationId || clarificationQuestion != question) {
                pendingClarificationTaskId = newClarificationId
                clarificationQuestion = question
                
                val optionsJson = clarification?.optJSONArray("options")
                val optionsList = mutableListOf<ClarificationOption>()
                if (optionsJson != null) {
                    for (i in 0 until optionsJson.length()) {
                        val opt = optionsJson.optJSONObject(i)
                        if (opt != null) {
                            optionsList.add(ClarificationOption(opt.optString("id"), opt.optString("label")))
                        }
                    }
                }
                
                val mainActivity = activity as? MainActivity
                val msg = Message("⚠️ Orchestrator Clarification: $question\nReply here.", false, optionsList)
                mainActivity?.getCachedMessages()?.add(msg)
                messageAdapter.notifyItemInserted((mainActivity?.getCachedMessages()?.size ?: 1) - 1)
                chatRecyclerView.scrollToPosition((mainActivity?.getCachedMessages()?.size ?: 1) - 1)
                
                etChatInput.hint = "Answer clarification..."
                etChatInput.setHintTextColor(android.graphics.Color.parseColor("#FFFF00"))
            }
        } else if (waitingPatchReviews != null && waitingPatchReviews.length() > 0) {
            val task = waitingPatchReviews.optJSONObject(0)
            val patchTaskId = task.optString("id")
            val taskStatus = task.optString("status")
            val workspace = task.optJSONObject("workspace")
            val patches = workspace?.optJSONArray("patches")
            var latestPatch: JSONObject? = null
            if (patches != null && patches.length() > 0) {
                latestPatch = patches.optJSONObject(patches.length() - 1)
            }
            
            showPatchReview(patchTaskId, taskStatus, latestPatch)
            
            if (pendingClarificationTaskId != patchTaskId) {
                pendingClarificationTaskId = patchTaskId
                clarificationQuestion = "PATCH_REVIEW"
                
                val mainActivity = activity as? MainActivity
                val msg = Message("🔍 Patch ready for review! You can also type 'approve' or 'reject'.", false)
                mainActivity?.getCachedMessages()?.add(msg)
                messageAdapter.notifyItemInserted((mainActivity?.getCachedMessages()?.size ?: 1) - 1)
                chatRecyclerView.scrollToPosition((mainActivity?.getCachedMessages()?.size ?: 1) - 1)
                
                etChatInput.hint = "Type approve or reject..."
                etChatInput.setHintTextColor(android.graphics.Color.parseColor("#00FF00"))
            }
        } else {
            view?.findViewById<FrameLayout>(R.id.patchReviewContainer)?.visibility = View.GONE
            if (pendingClarificationTaskId != null) {
                pendingClarificationTaskId = null
                clarificationQuestion = null
                etChatInput.hint = "Type command..."
                etChatInput.setHintTextColor(android.graphics.Color.parseColor("#555555"))
            }
        }
    }

    private fun sendPrompt() {
        val text = etChatInput.text.toString().trim()
        if (text.isEmpty()) return
        etChatInput.text.clear()
        
        val mainActivity = activity as? MainActivity
        mainActivity?.getCachedMessages()?.add(Message(text, true))
        val size = mainActivity?.getCachedMessages()?.size ?: 1
        messageAdapter.notifyItemInserted(size - 1)
        chatRecyclerView.scrollToPosition(size - 1)
        
        if (pendingClarificationTaskId != null) {
            if (clarificationQuestion == "PATCH_REVIEW") {
                if (text.lowercase() == "approve") {
                    sendTaskAction(pendingClarificationTaskId!!, "apply-patch")
                } else if (text.lowercase() == "reject") {
                    sendTaskAction(pendingClarificationTaskId!!, "reject-patch")
                } else {
                    mainActivity?.getCachedMessages()?.add(Message("❌ Please type 'approve' or 'reject'.", false))
                    messageAdapter.notifyItemInserted(size)
                    chatRecyclerView.scrollToPosition(size)
                }
            } else {
                sendClarification(pendingClarificationTaskId!!, text)
            }
            return
        }
        
        val type = taskTypeSpinner.selectedItem.toString()
        val executor = executorSpinner.selectedItem.toString()
        
        createTask(text, type, executor)
    }

    private fun sendTaskAction(taskId: String, action: String) {
        val ctx = context ?: return
        val reqBody = JSONObject().toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val req = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$taskId/$action", "POST", reqBody)
        ApiClient.client.newCall(req).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread { Toast.makeText(ctx, "Action failed: ${e.message}", Toast.LENGTH_SHORT).show() }
            }
            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    activity?.runOnUiThread { fetchWorkspace() }
                }
            }
        })
    }

    private fun sendClarification(taskId: String, answer: String) {
        val payload = JSONObject().apply {
            put("answer", answer)
        }
        val ctx = context ?: return
        val reqBody = payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val req = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$taskId/clarify", "POST", reqBody)
        ApiClient.client.newCall(req).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread { Toast.makeText(ctx, "Clarification failed: ${e.message}", Toast.LENGTH_SHORT).show() }
            }
            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    activity?.runOnUiThread { fetchWorkspace() }
                }
            }
        })
    }

    private fun createTask(userPrompt: String, taskType: String, executor: String) {
        val payload = JSONObject().apply {
            put("title", "Command Request")
            put("userPrompt", userPrompt)
            if (taskType != "auto") put("taskType", taskType)
            if (executor != "auto") put("executor", executor)
        }
        
        val ctx = context ?: return
        val reqBody = payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val req = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks", "POST", reqBody)
        ApiClient.client.newCall(req).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread { Toast.makeText(ctx, "Failed to send: ${e.message}", Toast.LENGTH_SHORT).show() }
            }
            override fun onResponse(call: Call, response: Response) {
                activity?.runOnUiThread {
                    if (response.isSuccessful) {
                        fetchWorkspace()
                    } else {
                        Toast.makeText(ctx, "Error: ${response.code}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })
    }

    private fun showPatchReview(taskId: String, taskStatus: String, patch: JSONObject?) {
        val container = view?.findViewById<FrameLayout>(R.id.patchReviewContainer) ?: return
        if (patch == null) {
            container.visibility = View.GONE
            return
        }
        val status = patch.optString("status")
        if (status != "proposed" && status != "applied") {
            container.visibility = View.GONE
            return
        }
        container.visibility = View.VISIBLE
        container.removeAllViews()

        val patchView = layoutInflater.inflate(R.layout.item_patch_review, container, false)
        patchView.findViewById<TextView>(R.id.patchTargetFile).text = patch.optString("targetFile")
        patchView.findViewById<TextView>(R.id.patchDiff).text = patch.optString("diff")

        val btnApply = patchView.findViewById<View>(R.id.btnApplyPatch)
        val btnReject = patchView.findViewById<View>(R.id.btnRejectPatch)
        val btnCommit = patchView.findViewById<View>(R.id.btnCommitPatch)
        val btnDiscard = patchView.findViewById<View>(R.id.btnDiscardPatch)

        if (taskStatus == "waiting_patch_review") {
            btnApply.visibility = View.VISIBLE
            btnReject.visibility = View.VISIBLE
            btnCommit.visibility = View.GONE
            btnDiscard.visibility = View.GONE
        } else if (taskStatus == "waiting_patch_approval") {
            btnApply.visibility = View.GONE
            btnReject.visibility = View.GONE
            btnCommit.visibility = View.VISIBLE
            btnDiscard.visibility = View.VISIBLE
        }

        btnApply.setOnClickListener {
            sendTaskAction(taskId, "apply-patch")
            container.visibility = View.GONE
        }
        btnReject.setOnClickListener {
            sendTaskAction(taskId, "reject-patch")
            container.visibility = View.GONE
        }
        btnCommit.setOnClickListener {
            sendTaskAction(taskId, "approve-patch")
            container.visibility = View.GONE
        }
        btnDiscard.setOnClickListener {
            sendTaskAction(taskId, "reject-patch")
            container.visibility = View.GONE
        }
        container.addView(patchView)
    }
}
