package com.jarvis

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment

class CommandCenterFragment : Fragment() {

    private lateinit var txtServerStatus: TextView
    private lateinit var txtProjects: TextView
    private lateinit var txtTasks: TextView
    private lateinit var txtReports: TextView

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        val view = inflater.inflate(R.layout.fragment_command_center, container, false)
        txtServerStatus = view.findViewById(R.id.txtServerStatus)
        txtProjects = view.findViewById(R.id.txtProjects)
        txtTasks = view.findViewById(R.id.txtTasks)
        txtReports = view.findViewById(R.id.txtReports)
        return view
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadData()
    }

    private fun loadData() {
        val ctx = context ?: return

        // 1. Status
        ApiClient.getCommandCenterStatus(ctx) { res, err ->
            activity?.runOnUiThread {
                if (err != null) {
                    txtServerStatus.text = "Eroare Status: ${err.message}"
                } else if (res != null && res.optBoolean("success")) {
                    val status = res.optJSONObject("status")
                    if (status != null) {
                        val memory = status.optJSONObject("memory")
                        val used = memory?.optDouble("usedGB", 0.0) ?: 0.0
                        val total = memory?.optDouble("totalGB", 0.0) ?: 0.0
                        val cpu = status.optDouble("cpuLoad", 0.0)
                        txtServerStatus.text = "CPU Load: $cpu%\nMemorie: $used / $total GB\nOS: ${status.optString("platform")}"
                    } else {
                        txtServerStatus.text = "Date de status lipsÄƒ."
                    }
                } else {
                    txtServerStatus.text = "RÄƒspuns invalid de la server."
                }
            }
        }

        // 2. Projects
        ApiClient.getCommandCenterProjects(ctx) { res, err ->
            activity?.runOnUiThread {
                if (err != null) {
                    txtProjects.text = "Eroare Proiecte: ${err.message}"
                } else if (res != null && res.optBoolean("success")) {
                    val projectsArray = res.optJSONArray("projects")
                    if (projectsArray != null && projectsArray.length() > 0) {
                        val sb = java.lang.StringBuilder()
                        for (i in 0 until projectsArray.length()) {
                            val p = projectsArray.optJSONObject(i) ?: continue
                            val name = p.optString("name", "Unknown")
                            val git = p.optJSONObject("git")
                            
                            var score = 100
                            var isDirty = false
                            
                            // Health Scoring
                            if (git != null) {
                                if (git.has("error") && git.optString("error").isNotEmpty()) {
                                    score -= 50
                                } else {
                                    isDirty = git.optBoolean("dirty", false)
                                    if (!isDirty) {
                                        score += 20 // clean
                                    } else {
                                        val changed = git.optInt("changedFiles", 0)
                                        score -= (changed * 2)
                                    }
                                }
                            }
                            
                            val markers = p.optJSONArray("markers")
                            if (markers != null && markers.length() > 0) {
                                score += 10
                            }
                            
                            // Cap score
                            if (score > 100) score = 100
                            if (score < 0) score = 0
                            
                            val dirtyStr = if (isDirty) "DIRTY" else "CLEAN"
                            sb.append("$name - Scor: $score ($dirtyStr)\n")
                        }
                        txtProjects.text = sb.toString().trim()
                    } else {
                        txtProjects.text = "Nu s-au gÄƒsit proiecte active."
                    }
                } else {
                    txtProjects.text = "Eroare: LipsÄƒ date proiecte."
                }
            }
        }

        // 3. Tasks
        ApiClient.getCommandCenterTasks(ctx) { res, err ->
            activity?.runOnUiThread {
                if (err != null) {
                    txtTasks.text = "Eroare Sarcini: ${err.message}"
                } else if (res != null && res.optBoolean("success")) {
                    val tasksArray = res.optJSONArray("tasks")
                    if (tasksArray != null && tasksArray.length() > 0) {
                        val sb = java.lang.StringBuilder()
                        for (i in 0 until Math.min(tasksArray.length(), 5)) {
                            val task = tasksArray.optJSONObject(i) ?: continue
                            sb.append("- ${task.optString("title", "FÄƒrÄƒ titlu")}\n")
                        }
                        txtTasks.text = sb.toString().trim()
                    } else {
                        txtTasks.text = "Nicio sarcinÄƒ nouÄƒ (Inbox gol)."
                    }
                } else {
                    txtTasks.text = "Nu s-au putut rula sarcinile."
                }
            }
        }

        // 4. Reports
        ApiClient.getCommandCenterReports(ctx) { res, err ->
            activity?.runOnUiThread {
                if (err != null) {
                    txtReports.text = "Eroare Rapoarte: ${err.message}"
                } else if (res != null && res.optBoolean("success")) {
                    val reportsArray = res.optJSONArray("reports")
                    if (reportsArray != null && reportsArray.length() > 0) {
                        val sb = java.lang.StringBuilder()
                        for (i in 0 until Math.min(reportsArray.length(), 3)) {
                            val report = reportsArray.optJSONObject(i) ?: continue
                            sb.append("â€¢ ${report.optString("name", "Unknown")}\n")
                        }
                        txtReports.text = sb.toString().trim()
                    } else {
                        txtReports.text = "Niciun raport generat recent."
                    }
                } else {
                    txtReports.text = "Rapoarte indisponibile."
                }
            }
        }
    }
}
