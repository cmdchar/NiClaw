package com.jarvis

import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import org.json.JSONArray
import org.json.JSONObject

class AgentMeshFragment : Fragment() {

    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var recyclerView: RecyclerView
    private lateinit var loadingIndicator: ProgressBar
    private lateinit var errorBanner: TextView
    private lateinit var btnSmokeTestAll: Button
    private lateinit var btnMeshBack: ImageButton

    private val nodesList = mutableListOf<JSONObject>()
    private lateinit var adapter: MeshNodeAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_agent_mesh, container, false)

        swipeRefresh = view.findViewById(R.id.swipeRefreshMesh)
        recyclerView = view.findViewById(R.id.meshRecyclerView)
        loadingIndicator = view.findViewById(R.id.meshLoading)
        errorBanner = view.findViewById(R.id.meshErrorBanner)
        btnSmokeTestAll = view.findViewById(R.id.btnSmokeTestAll)
        btnMeshBack = view.findViewById(R.id.btnMeshBack)

        adapter = MeshNodeAdapter(nodesList) { nodeId ->
            runSmokeTest(nodeId)
        }

        recyclerView.layoutManager = LinearLayoutManager(context)
        recyclerView.adapter = adapter

        swipeRefresh.setOnRefreshListener {
            loadMeshStatus(false)
        }

        btnSmokeTestAll.setOnClickListener {
            runSmokeTest("mesh")
        }

        btnMeshBack.setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        loadMeshStatus(true)

        return view
    }

    private fun loadMeshStatus(showLoading: Boolean) {
        if (showLoading) loadingIndicator.visibility = View.VISIBLE
        errorBanner.visibility = View.GONE

        ApiClient.getMeshStatus(requireContext()) { response, error ->
            activity?.runOnUiThread {
                if (showLoading) loadingIndicator.visibility = View.GONE
                swipeRefresh.isRefreshing = false

                if (error != null || response == null) {
                    showError("Agent Mesh Unreachable or API Pending\n${error?.message ?: ""}")
                    nodesList.clear()
                    adapter.notifyDataSetChanged()
                    return@runOnUiThread
                }

                if (!response.optBoolean("ok", false)) {
                    showError("Mesh responded with error or not ready.")
                }

                nodesList.clear()
                val nodesArray = response.optJSONArray("nodes") ?: JSONArray()
                for (i in 0 until nodesArray.length()) {
                    nodesList.add(nodesArray.getJSONObject(i))
                }
                adapter.notifyDataSetChanged()
            }
        }
    }

    private fun showError(msg: String) {
        errorBanner.text = msg
        errorBanner.visibility = View.VISIBLE
        Toast.makeText(context, "Eroare: $msg", Toast.LENGTH_LONG).show()
    }

    private fun runSmokeTest(target: String) {
        loadingIndicator.visibility = View.VISIBLE
        ApiClient.runMeshSmokeTest(requireContext(), target) { response, error ->
            activity?.runOnUiThread {
                loadingIndicator.visibility = View.GONE
                if (error != null) {
                    Toast.makeText(context, "Smoke test failed: ${error.message}", Toast.LENGTH_LONG).show()
                } else {
                    val status = response?.optJSONObject("event")?.optString("status")
                    if (response?.optBoolean("ok") == true && status == "completed") {
                        Toast.makeText(context, "Smoke test completed successfully", Toast.LENGTH_SHORT).show()
                        loadMeshStatus(false)
                    } else {
                        Toast.makeText(context, "Smoke test did not complete normally", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    inner class MeshNodeAdapter(
        private val items: List<JSONObject>,
        private val onActionClick: (String) -> Unit
    ) : RecyclerView.Adapter<MeshNodeAdapter.NodeViewHolder>() {

        inner class NodeViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val label: TextView = view.findViewById(R.id.nodeLabel)
            val status: TextView = view.findViewById(R.id.nodeStatus)
            val details: TextView = view.findViewById(R.id.nodeDetails)
            val btnAction: Button = view.findViewById(R.id.btnNodeAction)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NodeViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_mesh_node, parent, false)
            return NodeViewHolder(view)
        }

        override fun onBindViewHolder(holder: NodeViewHolder, position: Int) {
            val node = items[position]
            holder.label.text = node.optString("label", "Unknown Node")
            
            val statusVal = node.optString("status", "offline")
            holder.status.text = statusVal
            
            val colorStr = when (statusVal) {
                "online" -> "#10B981"
                "offline" -> "#EF4444"
                "degraded" -> "#F59E0B"
                "auth_required" -> "#3B82F6"
                "unavailable" -> "#64748B"
                else -> "#64748B"
            }
            holder.status.backgroundTintList = ColorStateList.valueOf(Color.parseColor(colorStr))

            val detailsObj = node.opt("details")
            var detailText = "No details available"
            if (detailsObj != null) {
                detailText = if (detailsObj is String) detailsObj else detailsObj.toString()
                if (detailText == "{}") detailText = "No details available"
            }
            holder.details.text = detailText

            val nodeId = node.optString("id", "")
            
            val canSmokeTest = listOf("openclaw-bridge", "openhuman-core", "codex", "hermes", "telegram-hermes", "mesh").contains(nodeId)
            
            if (statusVal == "offline") {
                holder.btnAction.isEnabled = false
                holder.btnAction.text = "API Pending"
            } else if (statusVal == "auth_required") {
                holder.btnAction.isEnabled = false
                holder.btnAction.text = "Auth Needed"
            } else if (!canSmokeTest) {
                holder.btnAction.isEnabled = false
                holder.btnAction.text = "No Action"
            } else {
                holder.btnAction.isEnabled = true
                holder.btnAction.text = "Run Smoke Test"
                holder.btnAction.setOnClickListener {
                    onActionClick(nodeId)
                }
            }
        }

        override fun getItemCount() = items.size
    }
}
