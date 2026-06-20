package com.jarvis

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject

class AgentActivityAdapter(private val agents: MutableList<JSONObject>) :
    RecyclerView.Adapter<AgentActivityAdapter.AgentViewHolder>() {

    class AgentViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvName: TextView = view.findViewById(R.id.tvAgentName)
        val tvStatus: TextView = view.findViewById(R.id.tvAgentStatus)
        val tvAction: TextView = view.findViewById(R.id.tvAgentAction)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AgentViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_agent_activity, parent, false)
        return AgentViewHolder(view)
    }

    override fun onBindViewHolder(holder: AgentViewHolder, position: Int) {
        val agent = agents[position]
        holder.tvName.text = agent.optString("name", "Unknown Agent")
        
        val status = agent.optString("status", "Offline")
        holder.tvStatus.text = status
        
        holder.tvAction.text = agent.optString("lastAction", "Idle")
        
        // Colorize status
        holder.tvStatus.setTextColor(if (status.equals("up", true)) 0xFF00E5FF.toInt() else 0xFFFF5252.toInt())
    }

    override fun getItemCount() = agents.size

    fun updateData(newAgents: List<JSONObject>) {
        agents.clear()
        agents.addAll(newAgents)
        notifyDataSetChanged()
    }
}
