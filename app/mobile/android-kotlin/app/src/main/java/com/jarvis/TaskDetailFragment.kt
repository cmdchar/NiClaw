package com.jarvis

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import android.widget.LinearLayout
import org.json.JSONObject
import java.io.IOException

class TaskDetailFragment : Fragment() {

    private lateinit var taskId: String
    private lateinit var detailTitle: TextView
    private lateinit var detailStatus: TextView
    private lateinit var detailLogs: TextView
    private lateinit var btnCancelTask: Button
    private lateinit var btnApproveTask: Button
    private lateinit var btnApplyPatch: Button
    private lateinit var btnRetryTask: Button
    private lateinit var btnRejectPatch: Button
    private lateinit var btnDetailBack: ImageButton
    
    // Patch UI
    private lateinit var patchContainer: LinearLayout
    private lateinit var tvPlannerValue: TextView
    private lateinit var tvExecutorValue: TextView
    private lateinit var tvRiskValue: TextView
    private lateinit var tvFilesChangedValue: TextView
    private lateinit var tvDiffPreview: TextView

    // New header + debug UI
    private lateinit var detailTaskId: TextView
    private lateinit var detailTaskType: TextView
    private lateinit var detailProject: TextView
    private lateinit var detailPlanner: TextView
    private lateinit var detailExecutor: TextView
    private lateinit var detailPrompt: TextView
    private lateinit var debugContainer: LinearLayout
    private lateinit var tvDebugRaw: TextView

    // Clarification UI
    private lateinit var clarificationContainer: LinearLayout
    private lateinit var tvClarificationReason: TextView
    private lateinit var tvClarificationQuestion: TextView
    private lateinit var cgClarificationOptions: com.google.android.material.chip.ChipGroup
    private lateinit var etClarificationAnswer: android.widget.EditText
    private lateinit var btnSubmitClarification: Button

    private val handler = Handler(Looper.getMainLooper())
    private var isPolling = false

    private val pollRunnable = object : Runnable {
        override fun run() {
            if (isPolling) {
                fetchTaskDetails()
                handler.postDelayed(this, 3000)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        taskId = arguments?.getString(ARG_TASK_ID) ?: ""
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_task_detail, container, false)
        
        taskId = arguments?.getString(ARG_TASK_ID) ?: ""
        
        detailTitle = view.findViewById(R.id.detailTitle)
        detailStatus = view.findViewById(R.id.detailStatus)
        detailLogs = view.findViewById(R.id.detailLogs)
        btnCancelTask = view.findViewById(R.id.btnCancelTask)
        btnApproveTask = view.findViewById(R.id.btnApproveTask)
        btnApplyPatch = view.findViewById(R.id.btnApplyPatch)
        btnRetryTask = view.findViewById(R.id.btnRetryTask)
        btnRejectPatch = view.findViewById(R.id.btnRejectPatch)
        btnDetailBack = view.findViewById(R.id.btnDetailBack)
        
        patchContainer = view.findViewById(R.id.patchContainer)
        tvPlannerValue = view.findViewById(R.id.tvPlannerValue)
        tvExecutorValue = view.findViewById(R.id.tvExecutorValue)
        tvRiskValue = view.findViewById(R.id.tvRiskValue)
        tvFilesChangedValue = view.findViewById(R.id.tvFilesChangedValue)
        tvDiffPreview = view.findViewById(R.id.tvDiffPreview)

        detailTaskId = view.findViewById(R.id.detailTaskId)
        detailTaskType = view.findViewById(R.id.detailTaskType)
        detailProject = view.findViewById(R.id.detailProject)
        detailPlanner = view.findViewById(R.id.detailPlanner)
        detailExecutor = view.findViewById(R.id.detailExecutor)
        detailPrompt = view.findViewById(R.id.detailPrompt)
        debugContainer = view.findViewById(R.id.debugContainer)
        tvDebugRaw = view.findViewById(R.id.tvDebugRaw)
        
        val btnToggleDebug: Button = view.findViewById(R.id.btnToggleDebug)
        btnToggleDebug.setOnClickListener {
            if (debugContainer.visibility == View.VISIBLE) {
                debugContainer.visibility = View.GONE
                btnToggleDebug.text = "Show Debug"
            } else {
                debugContainer.visibility = View.VISIBLE
                btnToggleDebug.text = "Hide Debug"
            }
        }

        clarificationContainer = view.findViewById(R.id.clarificationContainer)
        tvClarificationReason = view.findViewById(R.id.tvClarificationReason)
        tvClarificationQuestion = view.findViewById(R.id.tvClarificationQuestion)
        cgClarificationOptions = view.findViewById(R.id.cgClarificationOptions)
        etClarificationAnswer = view.findViewById(R.id.etClarificationAnswer)
        btnSubmitClarification = view.findViewById(R.id.btnSubmitClarification)

        btnSubmitClarification.setOnClickListener {
            submitClarification()
        }

        btnDetailBack.setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        btnApproveTask.setOnClickListener {
            sendAction("approve-patch")
        }

        btnRejectPatch.setOnClickListener {
            sendAction("reject-patch")
        }

        btnRetryTask.setOnClickListener {
            sendAction("retry-execution")
        }

        btnCancelTask.setOnClickListener {
            sendAction("cancel")
        }

        return view
    }

    override fun onResume() {
        super.onResume()
        if (taskId.isNotEmpty()) {
            isPolling = true
            handler.post(pollRunnable)
        }
    }

    override fun onPause() {
        super.onPause()
        isPolling = false
        handler.removeCallbacks(pollRunnable)
    }

    private fun fetchTaskDetails() {
        val ctx = context ?: return
        android.util.Log.d("TaskDetailFragment", "fetchTaskDetails: taskId=$taskId")
        if (taskId.isEmpty()) {
            activity?.runOnUiThread { detailTitle.text = "Missing taskId" }
            return
        }

        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$taskId", "GET")
        
        ApiClient.client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}
            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: return
                try {
                    val task = JSONObject(body)
                    
                    // Fetch workspace data for timeline
                    val wsRequest = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$taskId/workspace", "GET")
                    ApiClient.client.newCall(wsRequest).enqueue(object : Callback {
                        override fun onFailure(call: Call, e: IOException) {
                            renderTaskDetails(task, null)
                        }
                        override fun onResponse(call: Call, wsResponse: Response) {
                            val wsBody = wsResponse.body?.string()
                            val wsJson = try {
                                if (wsBody != null && wsResponse.isSuccessful) JSONObject(wsBody) else null
                            } catch (e: Exception) { null }
                            renderTaskDetails(task, wsJson)
                        }
                    })
                } catch (e: Exception) {}
            }
        })
    }

    private fun renderTaskDetails(task: JSONObject, workspace: JSONObject?) {
                    
                    val rawStatus = task.optString("status", "unknown")
                    val status = rawStatus.replace("=_", "_") // normalization

                    var prompt = task.optString("prompt")
                    if (prompt.isEmpty()) prompt = task.optString("userPrompt")
                    if (prompt.isEmpty()) prompt = task.optString("title")
                    if (prompt.isEmpty()) prompt = task.optString("description")
                    if (prompt.isEmpty()) prompt = "No prompt provided."

                    val promptLower = prompt.lowercase()
                    var type = task.optString("type")
                    if (type.isEmpty()) type = task.optString("taskType")
                    if (type.isEmpty()) {
                        type = if (promptLower.contains("agenți") || promptLower.contains("agenti") || promptLower.contains("responsive") || promptLower.contains("health") || promptLower.contains("test funcționalitate")) {
                            "agent_diagnostics"
                        } else {
                            "project_code_change"
                        }
                    }

                    var project = task.optString("targetProject")
                    if (project.isEmpty()) project = task.optString("target")
                    if (project.isEmpty()) project = task.optString("project")
                    if (type == "agent_diagnostics") {
                        project = "Agent Mesh / System"
                    } else if (project.isEmpty()) {
                        project = "none"
                    }

                    val planner = task.optString("plannerModel", "default")
                    val executor = task.optString("executorModel", "default")

                    var title = task.optString("title")
                    if (title.isEmpty()) title = task.optString("prompt")
                    if (title.isEmpty()) title = task.optString("userPrompt")
                    if (title.isEmpty()) title = task.optString("description")
                    if (title.isEmpty()) title = task.optString("objective")
                    if (title.length > 80) title = title.substring(0, 80) + "..."
                    if (title.isEmpty()) title = "Untitled task"

                    var eventsArr = task.optJSONArray("events")
                    if (workspace != null && workspace.has("events")) {
                        eventsArr = workspace.optJSONArray("events")
                    }
                    val logsArr = task.optJSONArray("logs")
                    
                    var intentAmbiguousReason = ""
                    var intentAmbiguousOptions = org.json.JSONArray()

                    val logsBuilder = java.lang.StringBuilder()
                    if (logsArr != null && logsArr.length() > 0) {
                        for (i in 0 until logsArr.length()) {
                            logsBuilder.append(logsArr.getString(i)).append("\n")
                        }
                    } else if (eventsArr != null) {
                        for (i in 0 until eventsArr.length()) {
                            val evt = eventsArr.optJSONObject(i)
                            if (evt != null) {
                                val evtType = evt.optString("type")
                                val message = evt.optString("message")
                                val reason = evt.optString("reason")
                                val timestamp = evt.optString("timestamp", "")
                                val data = evt.optJSONObject("data")
                                
                                if (evtType == "intent_ambiguous" || evtType == "workspace.patch.review_requested") {
                                    if (evtType == "intent_ambiguous") {
                                        intentAmbiguousReason = message
                                        if (data != null && data.has("options")) {
                                            intentAmbiguousOptions = data.optJSONArray("options") ?: org.json.JSONArray()
                                        }
                                    }
                                }

                                val tStampStr = if (timestamp.isNotEmpty()) "[$timestamp] " else ""
                                
                                // Enhanced formatting for workspace events
                                var displayType = evtType
                                if (evtType == "workspace.command.started") displayType = "COMMAND"
                                else if (evtType == "workspace.command.completed") displayType = "CMD_OK"
                                else if (evtType == "workspace.command.failed") displayType = "CMD_FAIL"
                                else if (evtType == "workspace.command.blocked") displayType = "BLOCKED"
                                else if (evtType == "workspace.artifact.created") displayType = "ARTIFACT"
                                else if (evtType == "workspace.patch.generated") displayType = "PATCH"
                                
                                if (message.isNotEmpty()) {
                                    logsBuilder.append("$tStampStr[$displayType] $message\n")
                                    if (reason.isNotEmpty()) {
                                        logsBuilder.append("  Reason: $reason\n")
                                    }
                                    if (data != null && data.has("command")) {
                                        logsBuilder.append("  > ${data.optString("command")}\n")
                                    }
                                    if (data != null && data.has("artifactId")) {
                                        logsBuilder.append("  * Artifact: ${data.optString("artifactId")}\n")
                                    }
                                } else {
                                    logsBuilder.append("$tStampStr[$displayType]\n")
                                }
                            }
                        }
                    }

                    val resultSummary = task.optString("resultSummary")
                    if (resultSummary.isNotEmpty()) {
                        logsBuilder.append("\n--- Result Summary ---\n").append(resultSummary)
                    }

                    activity?.runOnUiThread {
                        detailTaskId.text = "ID: $taskId"
                        detailTaskType.text = "Type: $type"
                        detailProject.text = "Target: $project"
                        detailPlanner.text = "Planner: $planner"
                        detailExecutor.text = "Executor: $executor"
                        detailPrompt.text = prompt
                        tvDebugRaw.text = task.toString(2)

                        detailTitle.text = title
                        detailStatus.text = status
                        detailLogs.text = logsBuilder.toString()
                        
                        btnCancelTask.visibility = View.GONE
                        btnApproveTask.visibility = View.GONE
                        btnApplyPatch.visibility = View.GONE
                        btnRetryTask.visibility = View.GONE
                        btnRejectPatch.visibility = View.GONE
                        
                        // Default color
                        detailStatus.setTextColor(android.graphics.Color.parseColor("#AAB8C2"))

                        if (status == "queued" || status == "planning" || status == "running" || status == "applying_patch" || status == "verifying") {
                            btnCancelTask.visibility = View.VISIBLE
                            btnCancelTask.setOnClickListener { sendAction("cancel") }
                            if (status == "running") {
                                detailStatus.setTextColor(android.graphics.Color.parseColor("#42A5F5")) // Blue
                            } else {
                                detailStatus.setTextColor(android.graphics.Color.parseColor("#FFCA28")) // Amber
                            }
                        }

                        if (status == "failed" || status == "cancelled" || status == "provider_quota_exceeded" || status == "blocked_policy_violation" || status == "patch_extraction_failed") {
                            btnRetryTask.visibility = View.VISIBLE
                            btnRetryTask.setOnClickListener { sendAction("retry") }
                            detailStatus.setTextColor(android.graphics.Color.parseColor("#EF5350")) // Red
                        }

                        if (status == "completed" || status == "no_changes" || status == "waiting_patch_approval" || status == "waiting_patch_review") {
                            if (status == "completed") {
                                btnCancelTask.visibility = View.GONE
                                detailStatus.setTextColor(android.graphics.Color.parseColor("#66BB6A")) // Green
                            } else if (status != "waiting_patch_approval" && status != "waiting_patch_review") {
                                detailStatus.setTextColor(android.graphics.Color.parseColor("#00E5FF")) // Cyan (Default)
                            }
                        }

                        // Also support `waiting_approval` (execution approval vs patch approval)
                        if (status == "waiting_approval") {
                            btnApproveTask.visibility = View.VISIBLE
                            btnApproveTask.setOnClickListener { sendAction("approve") }
                        } else if (status == "waiting_patch_approval") {
                            btnApproveTask.visibility = View.VISIBLE
                            btnApproveTask.setOnClickListener { sendAction("approve-patch") }
                            btnRejectPatch.visibility = View.VISIBLE
                            btnRejectPatch.setOnClickListener { sendAction("reject-patch") }
                        } else if (status == "waiting_patch_review") {
                            btnApplyPatch.visibility = View.VISIBLE
                            btnApplyPatch.setOnClickListener { sendAction("apply-patch") }
                            btnRejectPatch.visibility = View.VISIBLE
                            btnRejectPatch.setOnClickListener { sendAction("reject-patch") }
                            // Read patch from workspace first, fallback to fetchPatchData
                            var patchRendered = false
                            if (workspace != null && workspace.has("patches")) {
                                val patchesArr = workspace.optJSONArray("patches")
                                if (patchesArr != null && patchesArr.length() > 0) {
                                    renderPatchData(patchesArr.optJSONObject(patchesArr.length() - 1))
                                    patchRendered = true
                                }
                            }
                            if (!patchRendered) {
                                fetchPatchData()
                            }
                        } else {
                            patchContainer.visibility = View.GONE
                        }

                        if (status == "waiting_clarification") {
                            clarificationContainer.visibility = View.VISIBLE
                            detailStatus.setTextColor(android.graphics.Color.parseColor("#FFCA28")) // Yellow/Amber
                            
                            val clarification = task.optJSONObject("clarification")
                            var reason = "Clarification needed"
                            var question = "Ce vrei să testez sau ce țintă trebuie să folosesc?"
                            var options: org.json.JSONArray? = null
                            
                            if (clarification != null) {
                                reason = clarification.optString("reason", reason)
                                val q = clarification.optString("question", "")
                                if (q.isNotEmpty()) question = q
                                options = clarification.optJSONArray("options")
                            } else if (intentAmbiguousReason.isNotEmpty()) {
                                reason = intentAmbiguousReason
                                options = intentAmbiguousOptions
                            }

                            tvClarificationReason.text = reason
                            tvClarificationQuestion.text = question
                            
                            cgClarificationOptions.removeAllViews()
                            if (options != null && options.length() > 0) {
                                for (i in 0 until options.length()) {
                                    val optVal = options.opt(i)
                                    val chip = com.google.android.material.chip.Chip(context)
                                    
                                    if (optVal is JSONObject) {
                                        chip.text = optVal.optString("label")
                                        chip.tag = optVal.optString("id")
                                    } else {
                                        chip.text = optVal.toString()
                                        chip.tag = optVal.toString()
                                    }
                                    
                                    chip.isCheckable = true
                                    cgClarificationOptions.addView(chip)
                                }
                            }
                        } else {
                            clarificationContainer.visibility = View.GONE
                        }
                    }
    }

    private fun fetchPatchData() {
        val ctx = context ?: return
        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$taskId/patch")
        ApiClient.client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}
            override fun onResponse(call: Call, response: Response) {
                if (!response.isSuccessful) return
                val responseData = response.body?.string()
                if (responseData != null) {
                    try {
                        val patch = JSONObject(responseData)
                        renderPatchData(patch)
                    } catch (e: Exception) {}
                }
            }
        })
    }

    private fun renderPatchData(patch: JSONObject?) {
        if (patch == null) return
        activity?.runOnUiThread {
            patchContainer.visibility = View.VISIBLE
            tvPlannerValue.text = "Planner: ${patch.optString("planner", "Unknown")}"
            tvExecutorValue.text = "Executor: ${patch.optString("executor", "Unknown")}"
            tvRiskValue.text = "Risk Level: ${patch.optString("riskLevel", "unknown")}"
            
            val filesArray = patch.optJSONArray("filesChanged")
            var filesText = "Files Changed:\n"
            if (filesArray != null) {
                for (i in 0 until filesArray.length()) {
                    filesText += "- ${filesArray.getString(i)}\n"
                }
            }
            tvFilesChangedValue.text = filesText
            tvDiffPreview.text = patch.optString("diff", "No diff available")
        }
    }

    private fun sendAction(action: String) {
        val ctx = context ?: return
        val body = "{}".toRequestBody("application/json".toMediaType())
        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$taskId/$action", "POST", body)
        
        ApiClient.client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    Toast.makeText(ctx, "Error", Toast.LENGTH_SHORT).show()
                }
            }
            override fun onResponse(call: Call, response: Response) {
                activity?.runOnUiThread {
                    Toast.makeText(ctx, "Action $action sent", Toast.LENGTH_SHORT).show()
                    fetchTaskDetails()
                }
            }
        })
    }

    private fun submitClarification() {
        val answer = etClarificationAnswer.text.toString().trim()
        val checkedChipId = cgClarificationOptions.checkedChipId
        var selectedOptionId: String? = null
        
        if (checkedChipId != View.NO_ID) {
            val chip = cgClarificationOptions.findViewById<com.google.android.material.chip.Chip>(checkedChipId)
            selectedOptionId = chip?.tag as? String
        }

        if (answer.isEmpty() && selectedOptionId == null) {
            Toast.makeText(context, "Please select an option or type an answer", Toast.LENGTH_SHORT).show()
            return
        }

        val json = JSONObject()
        json.put("answer", answer)
        if (selectedOptionId != null) {
            json.put("selectedOptionId", selectedOptionId)
        }

        val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val ctx = context ?: return
        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$taskId/clarify", "POST", body)
        
        btnSubmitClarification.isEnabled = false
        ApiClient.client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    btnSubmitClarification.isEnabled = true
                    Toast.makeText(ctx, "Eroare trimitere clarificare", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                activity?.runOnUiThread {
                    btnSubmitClarification.isEnabled = true
                    if (response.isSuccessful) {
                        Toast.makeText(ctx, "Clarificare trimisă", Toast.LENGTH_SHORT).show()
                        etClarificationAnswer.text.clear()
                        cgClarificationOptions.clearCheck()
                        fetchTaskDetails()
                    } else {
                        Toast.makeText(ctx, "Eroare: ${response.code}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })
    }

    companion object {
        private const val ARG_TASK_ID = "task_id"

        fun newInstance(taskId: String) = TaskDetailFragment().apply {
            arguments = Bundle().apply {
                putString(ARG_TASK_ID, taskId)
            }
        }
    }
}
