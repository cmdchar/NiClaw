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

class SkillsFragment : Fragment() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var btnBack: ImageButton
    private lateinit var btnRefresh: ImageButton
    private lateinit var progressLoading: ProgressBar
    private lateinit var txtEmpty: TextView
    private val skills = mutableListOf<JSONObject>()
    private lateinit var adapter: SkillsAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_skills, container, false)

        recyclerView = view.findViewById(R.id.skillsRecyclerView)
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
            loadSkills()
        }

        // Setup RecyclerView
        adapter = SkillsAdapter(skills)
        recyclerView.layoutManager = LinearLayoutManager(context)
        recyclerView.adapter = adapter

        loadSkills()

        return view
    }

    private fun loadSkills() {
        val ctx = context ?: return
        progressLoading.visibility = View.VISIBLE
        txtEmpty.visibility = View.GONE

        ApiClient.getSkillsQuickAccess(ctx) { skillsArray, error ->
            activity?.runOnUiThread {
                progressLoading.visibility = View.GONE
                if (error != null) {
                    Toast.makeText(ctx, "Eroare: ${error.message}", Toast.LENGTH_LONG).show()
                    Log.e("SkillsFragment", "Failed to fetch skills", error)
                } else {
                    skills.clear()
                    if (skillsArray != null) {
                        for (i in 0 until skillsArray.length()) {
                            skills.add(skillsArray.getJSONObject(i))
                        }
                    }
                    adapter.notifyDataSetChanged()

                    if (skills.isEmpty()) {
                        txtEmpty.visibility = View.VISIBLE
                    }
                }
            }
        }
    }

    // Inner Adapter Class
    private inner class SkillsAdapter(private val items: List<JSONObject>) :
        RecyclerView.Adapter<SkillsAdapter.ViewHolder>() {

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val txtSkillIcon: TextView = view.findViewById(R.id.txtSkillIcon)
            val txtSkillName: TextView = view.findViewById(R.id.txtSkillName)
            val txtSkillVersion: TextView = view.findViewById(R.id.txtSkillVersion)
            val txtSkillDesc: TextView = view.findViewById(R.id.txtSkillDesc)
            val txtSkillSource: TextView = view.findViewById(R.id.txtSkillSource)
            val switchEnabled: SwitchCompat = view.findViewById(R.id.switchEnabled)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_skill, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val skill = items[position]

            val skillId = skill.optString("id", "")
            val name = skill.optString("name", "Skill Fără Nume")
            val desc = skill.optString("description", "")
            val enabled = skill.optBoolean("enabled", false)
            val icon = skill.optString("icon", "🧩")
            val version = skill.optString("version", "1.0.0")
            val source = skill.optString("source", "UNKNOWN")

            holder.txtSkillIcon.text = icon
            holder.txtSkillName.text = name
            holder.txtSkillVersion.text = "v$version"
            holder.txtSkillDesc.text = desc
            holder.txtSkillSource.text = source.uppercase()

            // Bind toggle change
            holder.switchEnabled.setOnCheckedChangeListener(null)
            holder.switchEnabled.isChecked = enabled
            holder.switchEnabled.setOnCheckedChangeListener { _, isChecked ->
                val ctx = holder.itemView.context
                ApiClient.toggleSkill(ctx, skillId, isChecked) { success, err ->
                    activity?.runOnUiThread {
                        if (!success) {
                            Toast.makeText(ctx, "Eroare toggle: ${err?.message}", Toast.LENGTH_SHORT).show()
                            // Revert toggle
                            holder.switchEnabled.setOnCheckedChangeListener(null)
                            holder.switchEnabled.isChecked = !isChecked
                            holder.switchEnabled.setOnCheckedChangeListener { _, _ -> }
                        } else {
                            Toast.makeText(ctx, "Skill " + (if (isChecked) "activat" else "dezactivat"), Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        }

        override fun getItemCount(): Int = items.size
    }
}
