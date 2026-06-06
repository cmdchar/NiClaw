package com.jarvis

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

class GovernanceFragment : Fragment() {

    private lateinit var rvGovernance: RecyclerView
    private lateinit var btnPending: Button
    private lateinit var btnLog: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var tvEmpty: TextView
    private lateinit var adapter: GovernanceAdapter

    private var currentMode = "queue" // or "log"
    private var items = mutableListOf<JSONObject>()
    private val client = OkHttpClient()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_governance, container, false)

        rvGovernance = view.findViewById(R.id.rvGovernance)
        btnPending = view.findViewById(R.id.btnPending)
        btnLog = view.findViewById(R.id.btnLog)
        progressBar = view.findViewById(R.id.progressBar)
        tvEmpty = view.findViewById(R.id.tvEmpty)

        rvGovernance.layoutManager = LinearLayoutManager(context)
        adapter = GovernanceAdapter(items) { action, id ->
            performAction(action, id)
        }
        rvGovernance.adapter = adapter

        btnPending.setOnClickListener {
            currentMode = "queue"
            updateTabStyle()
            fetchData()
        }

        btnLog.setOnClickListener {
            currentMode = "log"
            updateTabStyle()
            fetchData()
        }

        updateTabStyle()
        return view
    }

    override fun onResume() {
        super.onResume()
        fetchData()
    }

    private fun updateTabStyle() {
        if (currentMode == "queue") {
            btnPending.setBackgroundColor(0xFF3B82F6.toInt()) // Blue
            btnLog.setBackgroundColor(0xFF333333.toInt()) // Gray
        } else {
            btnPending.setBackgroundColor(0xFF333333.toInt())
            btnLog.setBackgroundColor(0xFF3B82F6.toInt())
        }
    }

    private fun getBaseUrl(): String {
        val prefs = requireContext().getSharedPreferences("JarvisPrefs", android.content.Context.MODE_PRIVATE)
        val wsUrl = prefs.getString("server_url", "ws://10.10.1.219:3000/jarvis/stream")!!
        return wsUrl.replace("ws://", "http://").replace("wss://", "https://").replace("/jarvis/stream", "")
    }

    private fun fetchData() {
        progressBar.visibility = View.VISIBLE
        tvEmpty.visibility = View.GONE
        
        val url = "${getBaseUrl()}/api/memory/governance/$currentMode"
        val request = Request.Builder().url(url).build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    progressBar.visibility = View.GONE
                    Toast.makeText(context, "Network Error", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val bodyStr = response.body?.string() ?: ""
                activity?.runOnUiThread {
                    progressBar.visibility = View.GONE
                    try {
                        val json = JSONObject(bodyStr)
                        if (json.getBoolean("success")) {
                            val resultArr = json.getJSONArray("result")
                            items.clear()
                            for (i in 0 until resultArr.length()) {
                                items.add(resultArr.getJSONObject(i))
                            }
                            adapter.notifyDataSetChanged()
                            if (items.isEmpty()) {
                                tvEmpty.visibility = View.VISIBLE
                            }
                        } else {
                            Toast.makeText(context, "API Error", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        })
    }

    private fun performAction(action: String, id: String) {
        progressBar.visibility = View.VISIBLE
        val endpoint = if (action == "rollback") "/api/memory/rollback/$id" else "/api/memory/governance/$id/$action"
        val url = "${getBaseUrl()}$endpoint"
        
        val request = Request.Builder()
            .url(url)
            .post("{}".toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                activity?.runOnUiThread {
                    progressBar.visibility = View.GONE
                    Toast.makeText(context, "Action Failed", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                activity?.runOnUiThread {
                    fetchData() // Refresh list after action
                }
            }
        })
    }

    inner class GovernanceAdapter(
        private val list: List<JSONObject>,
        private val onActionClick: (String, String) -> Unit
    ) : RecyclerView.Adapter<GovernanceAdapter.ViewHolder>() {

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val tvAction: TextView = view.findViewById(R.id.tvAction)
            val tvTarget: TextView = view.findViewById(R.id.tvTarget)
            val tvStatus: TextView = view.findViewById(R.id.tvStatus)
            val tvContentPreview: TextView = view.findViewById(R.id.tvContentPreview)
            val llActions: View = view.findViewById(R.id.llActions)
            val btnApprove: Button = view.findViewById(R.id.btnApprove)
            val btnReject: Button = view.findViewById(R.id.btnReject)
            val btnRollback: Button = view.findViewById(R.id.btnRollback)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_governance, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = list[position]
            val id = item.optString("id")
            val status = item.optString("status")
            
            holder.tvAction.text = item.optString("action")
            holder.tvTarget.text = item.optString("targetPath")
            holder.tvStatus.text = status
            
            val content = item.optString("diffPreview").ifEmpty { item.optString("contentPreview") }
            holder.tvContentPreview.text = content

            if (status == "pending") {
                holder.llActions.visibility = View.VISIBLE
                holder.btnApprove.visibility = View.VISIBLE
                holder.btnReject.visibility = View.VISIBLE
                holder.btnRollback.visibility = View.GONE
            } else if (status == "executed" && item.optString("snapshotId").isNotEmpty()) {
                holder.llActions.visibility = View.VISIBLE
                holder.btnApprove.visibility = View.GONE
                holder.btnReject.visibility = View.GONE
                holder.btnRollback.visibility = View.VISIBLE
            } else {
                holder.llActions.visibility = View.GONE
            }

            holder.btnApprove.setOnClickListener { onActionClick("approve", id) }
            holder.btnReject.setOnClickListener { onActionClick("reject", id) }
            holder.btnRollback.setOnClickListener { onActionClick("rollback", id) }
        }

        override fun getItemCount() = list.size
    }
}
