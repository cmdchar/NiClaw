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
import org.json.JSONObject
import java.io.IOException

class TaskDetailFragment : Fragment() {

    private lateinit var taskId: String
    private lateinit var detailTitle: TextView
    private lateinit var detailStatus: TextView
    private lateinit var detailLogs: TextView
    private lateinit var btnCancelTask: Button
    private lateinit var btnApproveTask: Button
    private lateinit var btnRetryTask: Button
    private lateinit var btnRejectPatch: Button
    private lateinit var btnDetailBack: ImageButton

    private val handler = Handler(Looper.getMainLooper())
    private var isPolling = false

    private val pollRunnable = object : Runnable {
        override fun run() {
            if (isPolling) {
                fetchTaskDetails()
                handler.postDelayed(this, 2000)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        taskId = arguments?.getString(ARG_TASK_ID) ?: ""
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_task_detail, container, false)
        
        detailTitle = view.findViewById(R.id.detailTitle)
        detailStatus = view.findViewById(R.id.detailStatus)
        detailLogs = view.findViewById(R.id.detailLogs)
        btnCancelTask = view.findViewById(R.id.btnCancelTask)
        btnApproveTask = view.findViewById(R.id.btnApproveTask)
        btnRetryTask = view.findViewById(R.id.btnRetryTask)
        btnRejectPatch = view.findViewById(R.id.btnRejectPatch)
        btnDetailBack = view.findViewById(R.id.btnDetailBack)

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
        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks/$taskId/events", "GET")
        
        ApiClient.client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}
            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: return
                try {
                    val json = JSONObject(body)
                    val task = json.optJSONObject("task") ?: return
                    val logsArr = json.optJSONArray("logs")
                    
                    val status = task.optString("status", "unknown")
                    val title = task.optString("title", "Unknown Task")
                    
                    val logsBuilder = java.lang.StringBuilder()
                    if (logsArr != null) {
                        for (i in 0 until logsArr.length()) {
                            logsBuilder.append(logsArr.getString(i)).append("\n")
                        }
                    }

                    activity?.runOnUiThread {
                        detailTitle.text = title
                        detailStatus.text = status
                        detailLogs.text = logsBuilder.toString()
                        
                        if (status == "waiting_patch_approval") {
                            btnApproveTask.visibility = View.VISIBLE
                            btnRejectPatch.visibility = View.VISIBLE
                            detailStatus.setTextColor(android.graphics.Color.parseColor("#FFCA28")) // Amber
                        } else {
                            btnApproveTask.visibility = View.GONE
                            btnRejectPatch.visibility = View.GONE
                        }
                        
                        if (status == "provider_quota_exceeded" || status == "failed" || status == "cancelled") {
                            if (status == "provider_quota_exceeded") {
                                btnRetryTask.visibility = View.VISIBLE
                                detailStatus.setTextColor(android.graphics.Color.parseColor("#FF9800")) // Orange
                            } else {
                                btnRetryTask.visibility = View.GONE
                                detailStatus.setTextColor(android.graphics.Color.parseColor("#EF5350")) // Red
                            }
                            btnCancelTask.visibility = View.GONE
                        } else {
                            btnRetryTask.visibility = View.GONE
                            btnCancelTask.visibility = View.VISIBLE
                            if (status == "completed") {
                                btnCancelTask.visibility = View.GONE
                                detailStatus.setTextColor(android.graphics.Color.parseColor("#66BB6A")) // Green
                            } else if (status != "waiting_patch_approval") {
                                detailStatus.setTextColor(android.graphics.Color.parseColor("#00E5FF")) // Cyan (Default)
                            }
                        }

                        if (status == "blocked_policy_violation") {
                            detailStatus.setTextColor(android.graphics.Color.parseColor("#EF5350")) // Red
                        }

                        // Also support `waiting_approval` (execution approval vs patch approval)
                        if (status == "waiting_approval") {
                            btnApproveTask.visibility = View.VISIBLE
                            btnApproveTask.setOnClickListener { sendAction("approve") }
                        } else if (status == "waiting_patch_approval") {
                            btnApproveTask.setOnClickListener { sendAction("approve-patch") }
                        }
                    }
                } catch (e: Exception) {}
            }
        })
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

    companion object {
        private const val ARG_TASK_ID = "task_id"

        fun newInstance(taskId: String) = TaskDetailFragment().apply {
            arguments = Bundle().apply {
                putString(ARG_TASK_ID, taskId)
            }
        }
    }
}
