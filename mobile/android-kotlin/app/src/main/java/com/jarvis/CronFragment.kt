package com.jarvis

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.widget.SwitchCompat
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject

class CronFragment : Fragment() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var btnBack: ImageButton
    private lateinit var btnRefresh: ImageButton
    private lateinit var progressLoading: ProgressBar
    private lateinit var txtEmpty: TextView
    private val cronJobs = mutableListOf<JSONObject>()
    private lateinit var adapter: CronAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_cron, container, false)

        recyclerView = view.findViewById(R.id.cronRecyclerView)
        btnBack = view.findViewById(R.id.btnBack)
        btnRefresh = view.findViewById(R.id.btnRefresh)
        progressLoading = view.findViewById(R.id.loadingProgress)
        txtEmpty = view.findViewById(R.id.txtEmpty)

        // Setup Back button
        btnBack.setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        // Setup Refresh button
        btnRefresh.setOnClickListener {
            loadCronJobs()
        }

        // Setup RecyclerView
        adapter = CronAdapter(cronJobs)
        recyclerView.layoutManager = LinearLayoutManager(context)
        recyclerView.adapter = adapter

        loadCronJobs()

        return view
    }

    private fun loadCronJobs() {
        val ctx = context ?: return
        progressLoading.visibility = View.VISIBLE
        txtEmpty.visibility = View.GONE

        ApiClient.getCronJobs(ctx) { jobsArray, error ->
            activity?.runOnUiThread {
                progressLoading.visibility = View.GONE
                if (error != null) {
                    Toast.makeText(ctx, "Eroare: ${error.message}", Toast.LENGTH_LONG).show()
                    Log.e("CronFragment", "Failed to fetch cron jobs", error)
                } else {
                    cronJobs.clear()
                    if (jobsArray != null) {
                        for (i in 0 until jobsArray.length()) {
                            cronJobs.add(jobsArray.getJSONObject(i))
                        }
                    }
                    adapter.notifyDataSetChanged()

                    if (cronJobs.isEmpty()) {
                        txtEmpty.visibility = View.VISIBLE
                    }
                }
            }
        }
    }

    // Inner Adapter Class
    private inner class CronAdapter(private val items: List<JSONObject>) :
        RecyclerView.Adapter<CronAdapter.ViewHolder>() {

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val txtCronName: TextView = view.findViewById(R.id.txtCronName)
            val txtCronTarget: TextView = view.findViewById(R.id.txtCronTarget)
            val txtCronExpr: TextView = view.findViewById(R.id.txtCronExpr)
            val txtCronLastRun: TextView = view.findViewById(R.id.txtCronLastRun)
            val switchEnabled: SwitchCompat = view.findViewById(R.id.switchEnabled)
            val btnTriggerRun: Button = view.findViewById(R.id.btnTriggerRun)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_cron, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val job = items[position]

            val id = job.optString("id", "")
            val name = job.optString("name", "Job Fără Nume")
            val enabled = job.optBoolean("enabled", false)
            val agentId = job.optString("agentId", "main")

            holder.txtCronName.text = name

            // Display target (delivery mode/recipient if any)
            val delivery = job.optJSONObject("delivery")
            val targetStr = if (delivery != null) {
                val mode = delivery.optString("mode", "none")
                val channel = delivery.optString("channel", "")
                val to = delivery.optString("to", "")
                "Agent: $agentId | Mode: $mode ($channel -> $to)"
            } else {
                "Agent: $agentId"
            }
            holder.txtCronTarget.text = targetStr

            // Schedule info
            val schedule = job.optJSONObject("schedule")
            val scheduleKind = schedule?.optString("kind", "") ?: ""
            val expr = schedule?.optString("expr", "") ?: ""
            holder.txtCronExpr.text = if (scheduleKind == "cron") expr else scheduleKind.uppercase()

            // Last Run info
            val lastRun = job.optJSONObject("lastRun")
            if (lastRun != null) {
                val success = lastRun.optBoolean("success", false)
                val duration = lastRun.optDouble("duration", 0.0)
                val durationFormatted = String.format("%.1fs", duration / 1000.0)

                holder.txtCronLastRun.text = if (success) {
                    holder.txtCronLastRun.setTextColor(0xFF00FF66.toInt())
                    "Succes ($durationFormatted)"
                } else {
                    holder.txtCronLastRun.setTextColor(0xFFFF5252.toInt())
                    "Eșuat"
                }
            } else {
                holder.txtCronLastRun.text = "Niciodată"
                holder.txtCronLastRun.setTextColor(0xFF8892B0.toInt())
            }

            // Bind toggle change without firing listener during binding
            holder.switchEnabled.setOnCheckedChangeListener(null)
            holder.switchEnabled.isChecked = enabled
            holder.switchEnabled.setOnCheckedChangeListener { _, isChecked ->
                val ctx = holder.itemView.context
                ApiClient.toggleCronJob(ctx, id, isChecked) { success, err ->
                    activity?.runOnUiThread {
                        if (!success) {
                            Toast.makeText(ctx, "Eroare toggle: ${err?.message}", Toast.LENGTH_SHORT).show()
                            // Revert toggle
                            holder.switchEnabled.setOnCheckedChangeListener(null)
                            holder.switchEnabled.isChecked = !isChecked
                            holder.switchEnabled.setOnCheckedChangeListener { _, _ -> }
                        } else {
                            Toast.makeText(ctx, "Job " + (if (isChecked) "activat" else "dezactivat"), Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }

            // Bind run button
            holder.btnTriggerRun.setOnClickListener {
                val ctx = holder.itemView.context
                holder.btnTriggerRun.isEnabled = false
                holder.btnTriggerRun.text = "Rulare..."

                ApiClient.triggerCronJob(ctx, id) { success, err ->
                    activity?.runOnUiThread {
                        holder.btnTriggerRun.isEnabled = true
                        holder.btnTriggerRun.text = "Rulează acum"
                        if (success) {
                            Toast.makeText(ctx, "Rulare declanșată cu succes!", Toast.LENGTH_SHORT).show()
                            loadCronJobs() // reload to show run status
                        } else {
                            Toast.makeText(ctx, "Eroare: ${err?.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        }

        override fun getItemCount(): Int = items.size
    }
}
