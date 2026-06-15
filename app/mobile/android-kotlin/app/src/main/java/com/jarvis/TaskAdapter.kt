package com.jarvis

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject

class TaskAdapter(private val onClick: (JSONObject) -> Unit) : RecyclerView.Adapter<TaskAdapter.TaskViewHolder>() {

    private val tasks = mutableListOf<JSONObject>()

    fun submitList(newTasks: List<JSONObject>) {
        tasks.clear()
        tasks.addAll(newTasks)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TaskViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_active_task, parent, false)
        return TaskViewHolder(view)
    }

    override fun onBindViewHolder(holder: TaskViewHolder, position: Int) {
        val task = tasks[position]
        holder.bind(task)
        holder.itemView.setOnClickListener {
            onClick(task)
        }
    }

    override fun getItemCount(): Int = tasks.size

    class TaskViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val title: TextView = itemView.findViewById(R.id.taskTitle)
        private val status: TextView = itemView.findViewById(R.id.taskStatus)
        private val project: TextView = itemView.findViewById(R.id.taskProject)
        private val prompt: TextView = itemView.findViewById(R.id.taskPrompt)

        fun bind(task: JSONObject) {
            title.text = task.optString("title", "Untitled Task")
            
            val statusStr = task.optString("status", "unknown")
            status.text = statusStr
            
            when (statusStr) {
                "completed" -> status.setTextColor(android.graphics.Color.parseColor("#66BB6A"))
                "failed", "cancelled", "blocked_policy_violation" -> status.setTextColor(android.graphics.Color.parseColor("#EF5350"))
                "provider_quota_exceeded" -> status.setTextColor(android.graphics.Color.parseColor("#FF9800"))
                "waiting_patch_approval", "waiting_approval" -> status.setTextColor(android.graphics.Color.parseColor("#FFCA28"))
                else -> status.setTextColor(android.graphics.Color.parseColor("#00E5FF"))
            }

            project.text = "Project: ${task.optString("targetProject", "none")}"
            prompt.text = task.optString("userPrompt", "")
        }
    }
}
