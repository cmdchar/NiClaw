package com.jarvis

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.google.android.material.floatingactionbutton.FloatingActionButton
import org.json.JSONObject

class AgentsFragment : Fragment() {

    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var recyclerView: RecyclerView
    private lateinit var loadingIndicator: ProgressBar
    private lateinit var emptyText: TextView
    private lateinit var btnAddAgent: FloatingActionButton

    private val agentsList = mutableListOf<JSONObject>()
    private lateinit var adapter: AgentAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_agents, container, false)

        swipeRefresh = view.findViewById(R.id.swipeRefreshAgents)
        recyclerView = view.findViewById(R.id.agentsRecyclerView)
        loadingIndicator = view.findViewById(R.id.agentsLoading)
        emptyText = view.findViewById(R.id.agentsEmptyText)
        btnAddAgent = view.findViewById(R.id.btnAddAgent)

        adapter = AgentAdapter(agentsList, 
            onEditClick = { agent -> showAgentEditorDialog(agent) },
            onDeleteClick = { agent -> showDeleteConfirmDialog(agent) }
        )

        recyclerView.layoutManager = LinearLayoutManager(context)
        recyclerView.adapter = adapter

        swipeRefresh.setOnRefreshListener {
            loadAgents(false)
        }

        btnAddAgent.setOnClickListener {
            showAgentEditorDialog(null)
        }

        loadAgents(true)

        return view
    }

    private fun loadAgents(showLoading: Boolean) {
        val ctx = context ?: return
        if (showLoading) {
            loadingIndicator.visibility = View.VISIBLE
            emptyText.visibility = View.GONE
            recyclerView.visibility = View.GONE
        }

        ApiClient.getAgents(ctx) { list, error ->
            activity?.runOnUiThread {
                loadingIndicator.visibility = View.GONE
                swipeRefresh.isRefreshing = false
                
                if (error != null) {
                    emptyText.visibility = View.VISIBLE
                    emptyText.text = "Eroare la conectare gateway:\n${error.localizedMessage}"
                    recyclerView.visibility = View.GONE
                    Toast.makeText(ctx, "Eroare API: ${error.message}", Toast.LENGTH_LONG).show()
                } else if (list.isNullOrEmpty()) {
                    agentsList.clear()
                    adapter.notifyDataSetChanged()
                    emptyText.visibility = View.VISIBLE
                    emptyText.text = "Nu s-au găsit agenți.\nTrage în jos pentru a reîncărca."
                    recyclerView.visibility = View.GONE
                } else {
                    agentsList.clear()
                    agentsList.addAll(list)
                    adapter.notifyDataSetChanged()
                    emptyText.visibility = View.GONE
                    recyclerView.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun showAgentEditorDialog(agent: JSONObject?) {
        val ctx = context ?: return
        val dialogView = LayoutInflater.from(ctx).inflate(R.layout.dialog_agent_editor, null)
        
        val editName = dialogView.findViewById<EditText>(R.id.editorAgentName)
        val editSlug = dialogView.findViewById<EditText>(R.id.editorAgentSlug)
        val editRole = dialogView.findViewById<EditText>(R.id.editorAgentRole)
        val editModel = dialogView.findViewById<EditText>(R.id.editorAgentModel)
        val dialogTitle = dialogView.findViewById<TextView>(R.id.dialogTitle)

        val isEditMode = agent != null
        if (isEditMode && agent != null) {
            dialogTitle.text = "Editează Agent: ${agent.optString("name")}"
            editName.setText(agent.optString("name"))
            editSlug.setText(agent.optString("id"))
            editSlug.isEnabled = false // ID/slug is immutable after creation
            editRole.setText(agent.optString("role"))
            editModel.setText(agent.optString("modelDisplay"))
        } else {
            dialogTitle.text = "Creează Agent Nou"
        }

        AlertDialog.Builder(ctx)
            .setView(dialogView)
            .setPositiveButton("Salvează") { dialog, _ ->
                val name = editName.text.toString().trim()
                val slug = editSlug.text.toString().trim()
                val role = editRole.text.toString().trim()
                val model = editModel.text.toString().trim()

                if (name.isEmpty() || slug.isEmpty()) {
                    Toast.makeText(ctx, "Numele și Slug sunt obligatorii!", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                if (isEditMode && agent != null) {
                    val id = agent.optString("id")
                    ApiClient.updateAgent(ctx, id, name, role, model) { success, error ->
                        handleActionResult(success, error, "Agent actualizat cu succes!", "Eroare la actualizare agent")
                    }
                } else {
                    ApiClient.createAgent(ctx, name, role, model) { success, error ->
                        handleActionResult(success, error, "Agent creat cu succes!", "Eroare la crearea agentului")
                    }
                }
                dialog.dismiss()
            }
            .setNegativeButton("Anulează", null)
            .show()
    }

    private fun showDeleteConfirmDialog(agent: JSONObject) {
        val ctx = context ?: return
        val id = agent.optString("id")
        val name = agent.optString("name")

        AlertDialog.Builder(ctx)
            .setTitle("Șterge Agent")
            .setMessage("Sigur doriți să ștergeți agentul '$name' ($id)?")
            .setPositiveButton("Șterge") { _, _ ->
                ApiClient.deleteAgent(ctx, id) { success, error ->
                    handleActionResult(success, error, "Agentul a fost șters!", "Eroare la ștergerea agentului")
                }
            }
            .setNegativeButton("Anulează", null)
            .show()
    }

    private fun handleActionResult(success: Boolean, error: Exception?, successMsg: String, errorPrefix: String) {
        activity?.runOnUiThread {
            if (success) {
                Toast.makeText(context, successMsg, Toast.LENGTH_SHORT).show()
                loadAgents(false)
            } else {
                Toast.makeText(context, "$errorPrefix: ${error?.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    // Inner Recycler Adapter for Agents
    private class AgentAdapter(
        private val list: List<JSONObject>,
        private val onEditClick: (JSONObject) -> Unit,
        private val onDeleteClick: (JSONObject) -> Unit
    ) : RecyclerView.Adapter<AgentAdapter.ViewHolder>() {

        class ViewHolder(v: View) : RecyclerView.ViewHolder(v) {
            val name: TextView = v.findViewById(R.id.agentName)
            val slug: TextView = v.findViewById(R.id.agentSlug)
            val role: TextView = v.findViewById(R.id.agentRole)
            val model: TextView = v.findViewById(R.id.agentModel)
            val status: TextView = v.findViewById(R.id.agentStatusBadge)
            val btnEdit: ImageButton = v.findViewById(R.id.btnEditAgent)
            val btnDelete: ImageButton = v.findViewById(R.id.btnDeleteAgent)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val v = LayoutInflater.from(parent.context).inflate(R.layout.item_agent, parent, false)
            return ViewHolder(v)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = list[position]
            holder.name.text = item.optString("name", "Nume indisp.")
            holder.slug.text = "slug: ${item.optString("id", "")}"
            
            val roleStr = item.optString("role", "")
            holder.role.text = "Rol: ${if (roleStr.isEmpty()) "Standard Agent" else roleStr}"
            
            val modelStr = item.optString("modelDisplay", "")
            holder.model.text = "Model: ${if (modelStr.isEmpty()) "Inherited" else modelStr}"
            
            val isDefault = item.optBoolean("isDefault", false)
            if (isDefault) {
                holder.status.text = "DEFAULT"
                holder.status.setTextColor(0xFF00E5FF.toInt())
                holder.status.setBackgroundResource(android.R.drawable.dialog_holo_dark_frame)
                holder.btnDelete.visibility = View.GONE
            } else {
                holder.status.text = "ACTIVE"
                holder.status.setTextColor(0xFFA0AEC0.toInt())
                holder.status.background = null
                holder.btnDelete.visibility = View.VISIBLE
            }

            holder.btnEdit.setOnClickListener { onEditClick(item) }
            holder.btnDelete.setOnClickListener { onDeleteClick(item) }
        }

        override fun getItemCount() = list.size
    }
}
