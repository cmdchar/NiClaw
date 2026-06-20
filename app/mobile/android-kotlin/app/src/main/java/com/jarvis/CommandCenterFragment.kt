package com.jarvis

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

class CommandCenterFragment : Fragment() {

    private lateinit var projectSpinner: Spinner
    private lateinit var taskPromptInput: EditText
    private lateinit var btnRunTask: Button
    private lateinit var tasksRecyclerView: RecyclerView
    private lateinit var btnCmdBack: ImageButton
    private lateinit var tvHermesStatus: TextView
    
    private val taskAdapter = TaskAdapter { task ->
        val fragment = TaskDetailFragment.newInstance(task.optString("id"))
        parentFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .addToBackStack(null)
            .commit()
    }
    
    private val handler = Handler(Looper.getMainLooper())
    private var isPolling = false
    private val projectIds = mutableListOf<String>()

    private val pollRunnable = object : Runnable {
        override fun run() {
            if (isPolling) {
                fetchTasks()
                handler.postDelayed(this, 2000)
            }
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_command_center, container, false)
        
        projectSpinner = view.findViewById(R.id.projectSpinner)
        taskPromptInput = view.findViewById(R.id.taskPromptInput)
        btnRunTask = view.findViewById(R.id.btnRunTask)
        tasksRecyclerView = view.findViewById(R.id.tasksRecyclerView)
        btnCmdBack = view.findViewById(R.id.btnCmdBack)
        tvHermesStatus = view.findViewById(R.id.tvHermesStatus)
        
        tasksRecyclerView.layoutManager = LinearLayoutManager(context)
        tasksRecyclerView.adapter = taskAdapter

        btnCmdBack.setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        btnRunTask.setOnClickListener {
            submitTask()
        }

        fetchProjects()
        fetchHealth()
        return view
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

    private fun fetchProjects() {
        val ctx = context ?: return
        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/projects", "GET")
        
        ApiClient.client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}
            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: return
                try {
                    val json = JSONObject(body)
                    val projects = json.optJSONArray("projects") ?: JSONArray()
                    val projectNames = mutableListOf<String>()
                    projectIds.clear()
                    
                    for (i in 0 until projects.length()) {
                        val p = projects.optJSONObject(i)
                        projectNames.add(p.optString("name", "Unknown"))
                        projectIds.add(p.optString("id", ""))
                    }
                    
                    // Add pseudo-projects
                    projectNames.add(0, "System (Auto Detect)")
                    projectIds.add(0, "")
                    
                    projectNames.add("Agent Diagnostics (Tooling)")
                    projectIds.add("_diagnostics_")

                    activity?.runOnUiThread {
                        val adapter = ArrayAdapter(ctx, android.R.layout.simple_spinner_dropdown_item, projectNames)
                        projectSpinner.adapter = adapter
                    }
                } catch (e: Exception) {}
            }
        })
    }

    private fun fetchHealth() {
        val ctx = context ?: return
        ApiClient.getOrchestratorHealth(ctx) { response, error ->
            if (response != null) {
                val healthArr = response.optJSONArray("health") ?: JSONArray()
                var hermesInfo = "Nu s-au primit date despre Hermes."
                for (i in 0 until healthArr.length()) {
                    val h = healthArr.optJSONObject(i)
                    if (h?.optString("service") == "Hermes") {
                        val status = h.optString("status")
                        val httpStatus = h.optString("httpStatus", "N/A")
                        val cliStatus = h.optString("cliStatus", "N/A")
                        val selTrans = h.optString("selectedTransport", "N/A")
                        val planTrans = h.optString("planningTransport", "N/A")
                        val models = h.optInt("modelsCount", 0)
                        hermesInfo = "Status: $status\nHTTP: $httpStatus | CLI: $cliStatus\nTransport Sel: $selTrans | Plan: $planTrans\nModele disponibile: $models"
                        break
                    }
                }
                activity?.runOnUiThread {
                    tvHermesStatus.text = hermesInfo
                }
            } else {
                activity?.runOnUiThread {
                    tvHermesStatus.text = "Eroare citire health: ${error?.message}"
                }
            }
        }
    }

    private fun fetchTasks() {
        val ctx = context ?: return
        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks", "GET")
        
        ApiClient.client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {}
            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: return
                try {
                    val json = JSONObject(body)
                    val tasksArr = json.optJSONArray("tasks") ?: JSONArray()
                    val tasksList = mutableListOf<JSONObject>()
                    
                    for (i in 0 until tasksArr.length()) {
                        tasksList.add(tasksArr.getJSONObject(i))
                    }
                    
                    activity?.runOnUiThread {
                        taskAdapter.submitList(tasksList)
                    }
                } catch (e: Exception) {}
            }
        })
    }

    private fun submitTask() {
        val prompt = taskPromptInput.text.toString().trim()
        if (prompt.isEmpty()) {
            Toast.makeText(context, "Please enter a prompt", Toast.LENGTH_SHORT).show()
            return
        }
        val selectedIdx = projectSpinner.selectedItemPosition
        if (selectedIdx < 0 || selectedIdx >= projectIds.size) return
        val projectId = projectIds[selectedIdx]

        val ctx = context ?: return
        btnRunTask.isEnabled = false
        
        val json = JSONObject()
        json.put("title", "Cmd: ${prompt.take(20)}...")
        json.put("userPrompt", prompt)
        
        if (projectId == "_diagnostics_") {
            json.put("taskType", "agent_diagnostics")
        } else if (projectId.isNotEmpty()) {
            json.put("targetProject", projectId)
        }
        
        val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = ApiClient.buildRequest(ctx, "/api/orchestrator/tasks", "POST", body)
        
        ApiClient.client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    btnRunTask.isEnabled = true
                    Toast.makeText(ctx, "Eroare rețea", Toast.LENGTH_SHORT).show()
                }
            }
            override fun onResponse(call: Call, response: Response) {
                activity?.runOnUiThread {
                    btnRunTask.isEnabled = true
                    if (response.isSuccessful) {
                        taskPromptInput.text.clear()
                        fetchTasks()
                        Toast.makeText(ctx, "Task trimis!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(ctx, "Eroare: ${response.code}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })
    }
}
