package com.jarvis

import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.text.method.ScrollingMovementMethod
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import org.json.JSONArray
import org.json.JSONObject

class SpatialFragment : Fragment() {

    private lateinit var txtPlanTitle: TextView
    private lateinit var txtPlanObjective: TextView
    private lateinit var txtPlanStatus: TextView
    private lateinit var btnRunActivePlan: Button

    private lateinit var cardApprovalRequest: LinearLayout
    private lateinit var txtApprovalStepTitle: TextView
    private lateinit var txtApprovalStepDetail: TextView
    private lateinit var btnApproveStep: Button
    private lateinit var btnRejectStep: Button

    private lateinit var layoutPlanSteps: LinearLayout
    private lateinit var txtSpatialConsole: TextView
    private lateinit var progressSpatial: ProgressBar
    private lateinit var btnRefreshSpatial: ImageButton

    private lateinit var btnCreateBoardSync: Button
    private lateinit var btnCreateDoctor: Button
    private lateinit var btnCreateGatewayRestart: Button
    private lateinit var btnCreateTypecheck: Button
    private lateinit var btnCreateHostApi: Button
    private lateinit var btnCreateBrowser: Button

    // System Health views
    private lateinit var txtGatewayState: TextView
    private lateinit var txtGatewayTransport: TextView
    private lateinit var txtGatewayRpc: TextView
    private lateinit var txtBoardaiStatus: TextView

    // Agent Harness views
    private lateinit var layoutAgentHarness: LinearLayout

    // Kanban tasks views
    private lateinit var layoutKanbanTasks: LinearLayout
    private lateinit var btnAddTask: Button
    private lateinit var layoutKanbanTabs: RadioGroup

    private var activePlanId: String? = null
    private var blockedStepId: String? = null

    private val agentsList = mutableListOf<JSONObject>()
    private val tasksList = mutableListOf<JSONObject>()
    private var currentKanbanStatus = "todo" // "todo" | "in_progress" | "done"

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_spatial, container, false)

        txtPlanTitle = view.findViewById(R.id.txtPlanTitle)
        txtPlanObjective = view.findViewById(R.id.txtPlanObjective)
        txtPlanStatus = view.findViewById(R.id.txtPlanStatus)
        btnRunActivePlan = view.findViewById(R.id.btnRunActivePlan)

        cardApprovalRequest = view.findViewById(R.id.cardApprovalRequest)
        txtApprovalStepTitle = view.findViewById(R.id.txtApprovalStepTitle)
        txtApprovalStepDetail = view.findViewById(R.id.txtApprovalStepDetail)
        btnApproveStep = view.findViewById(R.id.btnApproveStep)
        btnRejectStep = view.findViewById(R.id.btnRejectStep)

        layoutPlanSteps = view.findViewById(R.id.layoutPlanSteps)
        txtSpatialConsole = view.findViewById(R.id.txtSpatialConsole)
        progressSpatial = view.findViewById(R.id.progressSpatial)
        btnRefreshSpatial = view.findViewById(R.id.btnRefreshSpatial)

        btnCreateBoardSync = view.findViewById(R.id.btnCreateBoardSync)
        btnCreateDoctor = view.findViewById(R.id.btnCreateDoctor)
        btnCreateGatewayRestart = view.findViewById(R.id.btnCreateGatewayRestart)
        btnCreateTypecheck = view.findViewById(R.id.btnCreateTypecheck)
        btnCreateHostApi = view.findViewById(R.id.btnCreateHostApi)
        btnCreateBrowser = view.findViewById(R.id.btnCreateBrowser)

        // System Health bindings
        txtGatewayState = view.findViewById(R.id.txtGatewayState)
        txtGatewayTransport = view.findViewById(R.id.txtGatewayTransport)
        txtGatewayRpc = view.findViewById(R.id.txtGatewayRpc)
        txtBoardaiStatus = view.findViewById(R.id.txtBoardaiStatus)

        // Agent Harness bindings
        layoutAgentHarness = view.findViewById(R.id.layoutAgentHarness)

        // Kanban Tasks bindings
        layoutKanbanTasks = view.findViewById(R.id.layoutKanbanTasks)
        btnAddTask = view.findViewById(R.id.btnAddTask)
        layoutKanbanTabs = view.findViewById(R.id.layoutKanbanTabs)

        btnCreateBoardSync.setOnClickListener { createQuickPlan("board_sync") }
        btnCreateDoctor.setOnClickListener { createQuickPlan("doctor_diagnose") }
        btnCreateGatewayRestart.setOnClickListener { createQuickPlan("gateway_restart") }
        btnCreateTypecheck.setOnClickListener { createQuickPlan("build_validation") }
        btnCreateHostApi.setOnClickListener { createQuickPlan("host_api") }
        btnCreateBrowser.setOnClickListener { createQuickPlan("browser") }

        // Make console scrollable
        txtSpatialConsole.movementMethod = ScrollingMovementMethod()

        btnRefreshSpatial.setOnClickListener {
            loadAllData()
        }

        btnRunActivePlan.setOnClickListener {
            runActivePlan()
        }

        btnApproveStep.setOnClickListener {
            dispatchStepApproval("approve")
        }

        btnRejectStep.setOnClickListener {
            dispatchStepApproval("reject")
        }

        btnAddTask.setOnClickListener {
            showAddTaskDialog()
        }

        layoutKanbanTabs.setOnCheckedChangeListener { _, checkedId ->
            currentKanbanStatus = when (checkedId) {
                R.id.rbTodo -> "todo"
                R.id.rbInProgress -> "in_progress"
                R.id.rbDone -> "done"
                else -> "todo"
            }
            renderTasks()
            updateTabTextStyle()
        }

        // Initialize display tab states
        updateTabTextStyle()

        loadAllData()

        return view
    }

    private fun loadAllData() {
        val ctx = context ?: return
        progressSpatial.visibility = View.VISIBLE
        btnRefreshSpatial.isEnabled = false

        loadPlansData(ctx)
        loadGatewayHealth(ctx)
        loadBoardStatus(ctx)
        loadAgents(ctx)
        loadTasks(ctx)
    }

    private fun loadPlansData(ctx: Context) {
        ApiClient.getPlans(ctx) { plans, error ->
            activity?.runOnUiThread {
                progressSpatial.visibility = View.GONE
                btnRefreshSpatial.isEnabled = true

                if (error != null) {
                    Toast.makeText(ctx, "Eroare citire planuri: ${error.localizedMessage}", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }

                if (plans.isNullOrEmpty()) {
                    showEmptyState()
                    return@runOnUiThread
                }

                // Get the latest created plan (first in list)
                val latestPlan = plans[0]
                renderActivePlan(latestPlan)
            }
        }
    }

    private fun loadGatewayHealth(ctx: Context) {
        ApiClient.getGatewayHealth(ctx) { health, error ->
            activity?.runOnUiThread {
                if (error != null) {
                    txtGatewayState.text = "ERROR"
                    txtGatewayState.setTextColor(Color.parseColor("#EF5350"))
                    txtGatewayTransport.text = "ERROR"
                    txtGatewayTransport.setTextColor(Color.parseColor("#EF5350"))
                    txtGatewayRpc.text = "ERROR"
                    txtGatewayRpc.setTextColor(Color.parseColor("#EF5350"))
                    return@runOnUiThread
                }
                if (health != null) {
                    val healthy = health.optBoolean("healthy", false) || health.optBoolean("gatewayReady", false)
                    val state = health.optString("state", "idle")
                    txtGatewayState.text = state.toUpperCase()
                    if (healthy) {
                        txtGatewayState.setTextColor(Color.parseColor("#10B981")) // green
                    } else {
                        txtGatewayState.setTextColor(Color.parseColor("#F59E0B")) // orange
                    }

                    val capabilities = health.optJSONObject("capabilities")
                    val core = capabilities?.optJSONObject("core")
                    val transport = core?.optString("transport", "disconnected") ?: "disconnected"
                    val rpc = core?.optString("rpcRouter", "not_ready") ?: "not_ready"

                    txtGatewayTransport.text = transport.toUpperCase()
                    if (transport == "connected") {
                        txtGatewayTransport.setTextColor(Color.parseColor("#10B981"))
                    } else {
                        txtGatewayTransport.setTextColor(Color.parseColor("#8892B0"))
                    }

                    txtGatewayRpc.text = rpc.toUpperCase()
                    if (rpc == "ready") {
                        txtGatewayRpc.setTextColor(Color.parseColor("#10B981"))
                    } else {
                        txtGatewayRpc.setTextColor(Color.parseColor("#8892B0"))
                    }
                }
            }
        }
    }

    private fun loadBoardStatus(ctx: Context) {
        ApiClient.getBoardStatus(ctx) { status, error ->
            activity?.runOnUiThread {
                if (error != null) {
                    txtBoardaiStatus.text = "OFFLINE"
                    txtBoardaiStatus.setTextColor(Color.parseColor("#EF5350"))
                    return@runOnUiThread
                }
                if (status != null) {
                    val probe = status.optJSONObject("probe")
                    val reachable = probe?.optBoolean("reachable", false) ?: false
                    val revision = status.optInt("revision", 0)

                    if (reachable) {
                        txtBoardaiStatus.text = "REV $revision (ONLINE)"
                        txtBoardaiStatus.setTextColor(Color.parseColor("#10B981"))
                    } else {
                        txtBoardaiStatus.text = "REV $revision (UNREACHABLE)"
                        txtBoardaiStatus.setTextColor(Color.parseColor("#F59E0B"))
                    }
                }
            }
        }
    }

    private fun loadAgents(ctx: Context) {
        ApiClient.getAgents(ctx) { list, error ->
            activity?.runOnUiThread {
                if (error != null) {
                    layoutAgentHarness.removeAllViews()
                    val errTv = TextView(ctx).apply {
                        text = "Eroare încărcare agenți: ${error.localizedMessage}"
                        setTextColor(Color.parseColor("#EF5350"))
                        textSize = 12f
                        setPadding(0, 16, 0, 16)
                    }
                    layoutAgentHarness.addView(errTv)
                    return@runOnUiThread
                }
                agentsList.clear()
                if (list != null) {
                    agentsList.addAll(list)
                }
                renderAgents()
            }
        }
    }

    private fun renderAgents() {
        val ctx = context ?: return
        layoutAgentHarness.removeAllViews()

        if (agentsList.isEmpty()) {
            val emptyTv = TextView(ctx).apply {
                text = "Niciun agent în cluster."
                setTextColor(Color.parseColor("#8892B0"))
                textSize = 12f
                setPadding(0, 16, 0, 16)
                gravity = android.view.Gravity.CENTER
            }
            layoutAgentHarness.addView(emptyTv)
            return
        }

        val inflater = LayoutInflater.from(ctx)
        for (agent in agentsList) {
            val agentId = agent.optString("id")
            val name = agent.optString("name", "Unnamed")
            val model = agent.optString("modelDisplay", "inherited")
            val paused = agent.optBoolean("paused", false)
            val currentTask = agent.optString("currentTask", "")

            val row = inflater.inflate(R.layout.item_spatial_agent, layoutAgentHarness, false)

            val txtName = row.findViewById<TextView>(R.id.spatialAgentName)
            val txtModel = row.findViewById<TextView>(R.id.spatialAgentModel)
            val txtTask = row.findViewById<TextView>(R.id.spatialAgentTask)
            val badge = row.findViewById<TextView>(R.id.spatialAgentStatusBadge)
            val sw = row.findViewById<androidx.appcompat.widget.SwitchCompat>(R.id.spatialAgentSwitch)

            txtName.text = name
            txtModel.text = "model: $model"
            txtTask.text = if (currentTask.isNotEmpty()) "Task: $currentTask" else "Fără task activ"

            if (paused) {
                badge.text = "PAUSED"
                badge.setTextColor(Color.parseColor("#94A3B8"))
                badge.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#1E293B"))
                sw.isChecked = false
            } else {
                badge.text = "ACTIVE"
                badge.setTextColor(Color.parseColor("#00E5FF"))
                badge.backgroundTintList = android.content.res.ColorStateList.valueOf(Color.parseColor("#00E5FF22"))
                sw.isChecked = true
            }

            sw.setOnCheckedChangeListener(null)
            sw.setOnCheckedChangeListener { _, isChecked ->
                val nextPaused = !isChecked
                progressSpatial.visibility = View.VISIBLE
                ApiClient.toggleAgentPause(ctx, agentId, nextPaused) { success, err ->
                    activity?.runOnUiThread {
                        progressSpatial.visibility = View.GONE
                        if (success) {
                            Toast.makeText(ctx, "Status agent '$name' actualizat!", Toast.LENGTH_SHORT).show()
                            loadAgents(ctx)
                        } else {
                            Toast.makeText(ctx, "Eroare: ${err?.localizedMessage}", Toast.LENGTH_LONG).show()
                            sw.isChecked = isChecked // revert state
                        }
                    }
                }
            }

            layoutAgentHarness.addView(row)
        }
    }

    private fun loadTasks(ctx: Context) {
        ApiClient.getTasks(ctx) { list, error ->
            activity?.runOnUiThread {
                if (error != null) {
                    layoutKanbanTasks.removeAllViews()
                    val errTv = TextView(ctx).apply {
                        text = "Eroare încărcare sarcini: ${error.localizedMessage}"
                        setTextColor(Color.parseColor("#EF5350"))
                        textSize = 12f
                        setPadding(0, 16, 0, 16)
                    }
                    layoutKanbanTasks.addView(errTv)
                    return@runOnUiThread
                }
                tasksList.clear()
                if (list != null) {
                    tasksList.addAll(list)
                }
                updateTabLabels()
                renderTasks()
            }
        }
    }

    private fun updateTabLabels() {
        val rbTodo = view?.findViewById<RadioButton>(R.id.rbTodo) ?: return
        val rbInProgress = view?.findViewById<RadioButton>(R.id.rbInProgress) ?: return
        val rbDone = view?.findViewById<RadioButton>(R.id.rbDone) ?: return

        val todoCount = tasksList.count { it.optString("status") == "todo" }
        val inProgressCount = tasksList.count { it.optString("status") == "in_progress" }
        val doneCount = tasksList.count { it.optString("status") == "done" }

        rbTodo.text = "DE FĂCUT ($todoCount)"
        rbInProgress.text = "ÎN LUCRU ($inProgressCount)"
        rbDone.text = "FINALIZAT ($doneCount)"
    }

    private fun updateTabTextStyle() {
        val rbTodo = view?.findViewById<RadioButton>(R.id.rbTodo) ?: return
        val rbInProgress = view?.findViewById<RadioButton>(R.id.rbInProgress) ?: return
        val rbDone = view?.findViewById<RadioButton>(R.id.rbDone) ?: return

        // Highlights checked tab text color
        rbTodo.setTextColor(if (currentKanbanStatus == "todo") Color.parseColor("#00E5FF") else Color.parseColor("#8892B0"))
        rbInProgress.setTextColor(if (currentKanbanStatus == "in_progress") Color.parseColor("#00E5FF") else Color.parseColor("#8892B0"))
        rbDone.setTextColor(if (currentKanbanStatus == "done") Color.parseColor("#00E5FF") else Color.parseColor("#8892B0"))
    }

    private fun renderTasks() {
        val ctx = context ?: return
        layoutKanbanTasks.removeAllViews()

        val filtered = tasksList.filter { it.optString("status", "todo") == currentKanbanStatus }

        if (filtered.isEmpty()) {
            val emptyTv = TextView(ctx).apply {
                text = "Nu există sarcini în această secțiune."
                setTextColor(Color.parseColor("#8892B0"))
                textSize = 12f
                setPadding(0, 16, 0, 16)
                gravity = android.view.Gravity.CENTER
            }
            layoutKanbanTasks.addView(emptyTv)
            return
        }

        val inflater = LayoutInflater.from(ctx)
        for (task in filtered) {
            val taskId = task.optString("id")
            val title = task.optString("title", "Unnamed Task")
            val desc = task.optString("description", "")
            val status = task.optString("status", "todo")
            val agentId = task.optString("agentId", "")
            val planId = task.optString("planId", "")
            val filePath = task.optString("filePath", "")
            val createdAt = task.optString("createdAt", "")

            val row = inflater.inflate(R.layout.item_spatial_task, layoutKanbanTasks, false)

            val txtTitle = row.findViewById<TextView>(R.id.spatialTaskTitle)
            val txtDesc = row.findViewById<TextView>(R.id.spatialTaskDesc)
            val txtAgent = row.findViewById<TextView>(R.id.spatialTaskAgent)
            val txtPlan = row.findViewById<TextView>(R.id.spatialTaskPlan)
            val txtFile = row.findViewById<TextView>(R.id.spatialTaskFile)
            val txtTime = row.findViewById<TextView>(R.id.spatialTaskTime)

            val btnDel = row.findViewById<ImageButton>(R.id.btnDeleteTask)
            val btnLeft = row.findViewById<ImageButton>(R.id.btnMoveLeft)
            val btnRight = row.findViewById<ImageButton>(R.id.btnMoveRight)

            txtTitle.text = title
            txtDesc.text = if (desc.isNotEmpty()) desc else "Fără descriere."

            if (createdAt.isNotEmpty()) {
                val timeStr = if (createdAt.length >= 16) createdAt.substring(11, 16) else createdAt
                txtTime.text = "Creat: $timeStr"
            } else {
                txtTime.text = ""
            }

            if (agentId.isNotEmpty()) {
                txtAgent.text = "Agent: $agentId"
                txtAgent.visibility = View.VISIBLE
            } else {
                txtAgent.visibility = View.GONE
            }

            if (planId.isNotEmpty()) {
                txtPlan.text = "Plan: $planId"
                txtPlan.visibility = View.VISIBLE
            } else {
                txtPlan.visibility = View.GONE
            }

            if (filePath.isNotEmpty()) {
                txtFile.text = "Fișier: $filePath"
                txtFile.visibility = View.VISIBLE
            } else {
                txtFile.visibility = View.GONE
            }

            if (status == "todo") {
                btnLeft.visibility = View.INVISIBLE
            } else {
                btnLeft.visibility = View.VISIBLE
                btnLeft.setOnClickListener {
                    val prevStatus = if (status == "done") "in_progress" else "todo"
                    moveTask(ctx, taskId, prevStatus)
                }
            }

            if (status == "done") {
                btnRight.visibility = View.INVISIBLE
            } else {
                btnRight.visibility = View.VISIBLE
                btnRight.setOnClickListener {
                    val nextStatus = if (status == "todo") "in_progress" else "done"
                    moveTask(ctx, taskId, nextStatus)
                }
            }

            btnDel.setOnClickListener {
                AlertDialog.Builder(ctx)
                    .setTitle("Șterge Task")
                    .setMessage("Sigur doriți să ștergeți task-ul '$title'?")
                    .setPositiveButton("Șterge") { _, _ ->
                        progressSpatial.visibility = View.VISIBLE
                        ApiClient.deleteTask(ctx, taskId) { success, err ->
                            activity?.runOnUiThread {
                                progressSpatial.visibility = View.GONE
                                if (success) {
                                    Toast.makeText(ctx, "Sarcina a fost ștearsă!", Toast.LENGTH_SHORT).show()
                                    loadTasks(ctx)
                                } else {
                                    Toast.makeText(ctx, "Eroare: ${err?.localizedMessage}", Toast.LENGTH_LONG).show()
                                }
                            }
                        }
                    }
                    .setNegativeButton("Anulează", null)
                    .show()
            }

            layoutKanbanTasks.addView(row)
        }
    }

    private fun moveTask(ctx: Context, taskId: String, nextStatus: String) {
        progressSpatial.visibility = View.VISIBLE
        ApiClient.updateTaskStatus(ctx, taskId, nextStatus) { success, err ->
            activity?.runOnUiThread {
                progressSpatial.visibility = View.GONE
                if (success) {
                    loadTasks(ctx)
                } else {
                    Toast.makeText(ctx, "Eroare la mutarea sarcinii: ${err?.localizedMessage}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun showAddTaskDialog() {
        val ctx = context ?: return
        val dialogView = LayoutInflater.from(ctx).inflate(R.layout.dialog_spatial_task_editor, null)

        val editTitle = dialogView.findViewById<EditText>(R.id.editorTaskTitle)
        val editDesc = dialogView.findViewById<EditText>(R.id.editorTaskDesc)
        val statusGroup = dialogView.findViewById<RadioGroup>(R.id.editorTaskStatusGroup)

        AlertDialog.Builder(ctx)
            .setView(dialogView)
            .setPositiveButton("Adaugă") { dialog, _ ->
                val title = editTitle.text.toString().trim()
                val desc = editDesc.text.toString().trim()

                val status = when (statusGroup.checkedRadioButtonId) {
                    R.id.radioTodo -> "todo"
                    R.id.radioInProgress -> "in_progress"
                    R.id.radioDone -> "done"
                    else -> "todo"
                }

                if (title.isEmpty()) {
                    Toast.makeText(ctx, "Titlul sarcinii este obligatoriu!", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                progressSpatial.visibility = View.VISIBLE
                ApiClient.createTask(ctx, title, desc, status) { success, error ->
                    activity?.runOnUiThread {
                        progressSpatial.visibility = View.GONE
                        if (success) {
                            Toast.makeText(ctx, "Sarcina a fost adăugată!", Toast.LENGTH_SHORT).show()
                            loadTasks(ctx)
                        } else {
                            Toast.makeText(ctx, "Eroare crearea sarcinii: ${error?.message}", Toast.LENGTH_LONG).show()
                        }
                    }
                }
                dialog.dismiss()
            }
            .setNegativeButton("Anulează", null)
            .show()
    }

    private fun showEmptyState() {
        activePlanId = null
        blockedStepId = null
        txtPlanTitle.text = "Niciun Plan Activ"
        txtPlanObjective.text = "Nu a fost creat niciun plan de execuție în Spatial OS."
        txtPlanStatus.text = "FĂRĂ PLAN"
        txtPlanStatus.setBackgroundColor(Color.parseColor("#1E293B"))
        txtPlanStatus.setTextColor(Color.parseColor("#94A3B8"))
        btnRunActivePlan.visibility = View.GONE
        cardApprovalRequest.visibility = View.GONE

        layoutPlanSteps.removeAllViews()
        val emptyTv = TextView(context).apply {
            text = "Niciun pas configurat."
            setTextColor(Color.parseColor("#8892B0"))
            textSize = 12f
            setPadding(0, 24, 0, 24)
            gravity = android.view.Gravity.CENTER
        }
        layoutPlanSteps.addView(emptyTv)

        txtSpatialConsole.text = "Nu există evenimente."
    }

    private fun renderActivePlan(plan: JSONObject) {
        val planId = plan.optString("id")
        activePlanId = planId

        val title = plan.optString("title", "Plan fără titlu")
        val objective = plan.optString("objective", "")
        val status = plan.optString("status", "draft").toUpperCase()

        txtPlanTitle.text = title
        txtPlanObjective.text = objective
        txtPlanStatus.text = status

        // Status styling
        when (status) {
            "COMPLETED" -> {
                txtPlanStatus.setBackgroundColor(Color.parseColor("#065F46")) // dark green
                txtPlanStatus.setTextColor(Color.parseColor("#A7F3D0"))
                btnRunActivePlan.visibility = View.GONE
            }
            "BLOCKED" -> {
                txtPlanStatus.setBackgroundColor(Color.parseColor("#78350F")) // dark amber
                txtPlanStatus.setTextColor(Color.parseColor("#FDE68A"))
                btnRunActivePlan.visibility = View.VISIBLE
            }
            "FAILED" -> {
                txtPlanStatus.setBackgroundColor(Color.parseColor("#7F1D1D")) // dark red
                txtPlanStatus.setTextColor(Color.parseColor("#FCA5A5"))
                btnRunActivePlan.visibility = View.VISIBLE
            }
            else -> {
                txtPlanStatus.setBackgroundColor(Color.parseColor("#0C4A6E")) // dark blue
                txtPlanStatus.setTextColor(Color.parseColor("#BAE6FD"))
                btnRunActivePlan.visibility = View.VISIBLE
            }
        }

        // Render steps list
        layoutPlanSteps.removeAllViews()
        val stepsArray = plan.optJSONArray("steps") ?: JSONArray()
        var pendingApprovalStep: JSONObject? = null

        if (stepsArray.length() == 0) {
            val emptyTv = TextView(context).apply {
                text = "Niciun pas configurat."
                setTextColor(Color.parseColor("#8892B0"))
                textSize = 12f
                setPadding(0, 24, 0, 24)
                gravity = android.view.Gravity.CENTER
            }
            layoutPlanSteps.addView(emptyTv)
        } else {
            for (i in 0 until stepsArray.length()) {
                val step = stepsArray.getJSONObject(i)
                val stepTitle = step.optString("title", "Pas $i")
                val stepDetail = step.optString("detail", "")
                val stepStatus = step.optString("status", "pending").toUpperCase()
                val stepRequiresApproval = step.optBoolean("requiresApproval", false)
                val stepApprovalStatus = step.optString("approvalStatus", "not_required")

                if (stepRequiresApproval && stepApprovalStatus == "pending") {
                    pendingApprovalStep = step
                }

                val itemLayout = LinearLayout(context).apply {
                    orientation = LinearLayout.VERTICAL
                    setPadding(0, 8, 0, 8)
                }

                val rowLayout = LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                }

                val statusLabel = TextView(context).apply {
                    text = "• $stepStatus"
                    textSize = 12f
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        rightMargin = 16
                    }
                    when (stepStatus) {
                        "COMPLETED" -> setTextColor(Color.parseColor("#10B981"))
                        "BLOCKED" -> setTextColor(Color.parseColor("#F59E0B"))
                        "FAILED" -> setTextColor(Color.parseColor("#EF5350"))
                        else -> setTextColor(Color.parseColor("#5E6D8C"))
                    }
                }

                val stepTitleTv = TextView(context).apply {
                    text = stepTitle
                    setTextColor(Color.WHITE)
                    textSize = 12f
                    setTypeface(null, android.graphics.Typeface.BOLD)
                }

                rowLayout.addView(statusLabel)
                rowLayout.addView(stepTitleTv)
                itemLayout.addView(rowLayout)

                if (stepDetail.isNotEmpty()) {
                    val stepDetailTv = TextView(context).apply {
                        text = stepDetail
                        setTextColor(Color.parseColor("#8892B0"))
                        textSize = 11f
                        setPadding(32, 2, 0, 0)
                    }
                    itemLayout.addView(stepDetailTv)
                }

                layoutPlanSteps.addView(itemLayout)
            }
        }

        // Render approval gate card
        if (pendingApprovalStep != null) {
            blockedStepId = pendingApprovalStep.optString("id")
            txtApprovalStepTitle.text = pendingApprovalStep.optString("title")
            txtApprovalStepDetail.text = pendingApprovalStep.optString("detail", "Comandă securizată ce necesită verificare manuală.")
            cardApprovalRequest.visibility = View.VISIBLE
        } else {
            blockedStepId = null
            cardApprovalRequest.visibility = View.GONE
        }

        // Render console timeline
        val consoleText = StringBuilder()
        val runsArray = plan.optJSONArray("runs") ?: JSONArray()
        val allEvents = mutableListOf<JSONObject>()

        for (i in 0 until runsArray.length()) {
            val run = runsArray.getJSONObject(i)
            val eventsArray = run.optJSONArray("events") ?: JSONArray()
            for (j in 0 until eventsArray.length()) {
                allEvents.add(eventsArray.getJSONObject(j))
            }
        }

        allEvents.sortBy { it.optString("ts", "") }

        if (allEvents.isEmpty()) {
            consoleText.append("Nu există evenimente recente pe planul activ.\n")
        } else {
            for (event in allEvents) {
                val ts = event.optString("ts", "")
                val timeStr = if (ts.length >= 19) ts.substring(11, 19) else ts
                val level = event.optString("level", "info").toUpperCase()
                val msg = event.optString("message", "")
                consoleText.append("[$timeStr] $level: $msg\n")
            }
        }

        txtSpatialConsole.text = consoleText.toString()
        val scrollAmount = txtSpatialConsole.layout?.getLineTop(txtSpatialConsole.lineCount)?.minus(txtSpatialConsole.height) ?: 0
        if (scrollAmount > 0) {
            txtSpatialConsole.scrollTo(0, scrollAmount)
        }
    }

    private fun runActivePlan() {
        val planId = activePlanId ?: return
        val ctx = context ?: return
        Log.d("SpatialFragment", "runActivePlan: triggered for planId=$planId")

        progressSpatial.visibility = View.VISIBLE
        ApiClient.runPlan(ctx, planId) { response, error ->
            activity?.runOnUiThread {
                progressSpatial.visibility = View.GONE
                if (error != null) {
                    Log.e("SpatialFragment", "runActivePlan error: ${error.message}", error)
                    Toast.makeText(ctx, "Eroare lansare plan: ${error.localizedMessage}", Toast.LENGTH_LONG).show()
                } else if (response != null) {
                    Log.d("SpatialFragment", "runActivePlan success: plan triggered on server")
                    Toast.makeText(ctx, "Planul a fost pornit pe server!", Toast.LENGTH_SHORT).show()
                    loadAllData()
                }
            }
        }
    }

    private fun dispatchStepApproval(action: String) {
        val planId = activePlanId ?: return
        val stepId = blockedStepId ?: return
        val ctx = context ?: return
        Log.d("SpatialFragment", "dispatchStepApproval: planId=$planId stepId=$stepId action=$action")

        progressSpatial.visibility = View.VISIBLE
        ApiClient.approvePlanStep(ctx, planId, stepId, action) { success, error ->
            activity?.runOnUiThread {
                progressSpatial.visibility = View.GONE
                if (success) {
                    Log.d("SpatialFragment", "dispatchStepApproval success: action=$action stepId=$stepId")
                    val statusText = if (action == "approve") "aprobat" else "respins"
                    Toast.makeText(ctx, "Pasul a fost $statusText cu succes!", Toast.LENGTH_SHORT).show()
                    loadAllData()
                } else {
                    Log.e("SpatialFragment", "dispatchStepApproval error: ${error?.message}", error)
                    Toast.makeText(ctx, "Eroare: ${error?.localizedMessage}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun createQuickPlan(kind: String) {
        val ctx = context ?: return
        Log.d("SpatialFragment", "createQuickPlan: kind=$kind")
        progressSpatial.visibility = View.VISIBLE

        val title: String
        val objective: String
        val steps = JSONArray()

        when (kind) {
            "board_sync" -> {
                title = "Sync BoardAI Brainmap"
                objective = "Publish the current BOARD_BRAINMAP snapshot to board.private-driver.ro through the real BoardAI Host API adapter."
                steps.put(JSONObject().apply {
                    put("kind", "board_sync")
                    put("title", "Publish BoardAI snapshot")
                    put("detail", "Calls the backend BoardAI sync service and records the result as a plan run event.")
                })
            }
            "doctor_diagnose" -> {
                title = "Run OpenClaw Doctor Diagnose"
                objective = "Run the existing read-only OpenClaw Doctor diagnostic service and persist its result as a Spatial Plan event."
                steps.put(JSONObject().apply {
                    put("kind", "doctor_diagnose")
                    put("title", "Diagnose OpenClaw runtime")
                    put("detail", "Calls the backend OpenClaw Doctor diagnose service.")
                })
            }
            "gateway_restart" -> {
                title = "Restart OpenClaw Gateway"
                objective = "Restart the OpenClaw Gateway through the existing GatewayManager only after an explicit approval is persisted by the Spatial Plan backend."
                steps.put(JSONObject().apply {
                    put("kind", "gateway_restart")
                    put("title", "Approve and restart OpenClaw Gateway")
                    put("detail", "Runtime-impacting action. Execution remains blocked until the owner explicitly approves this step.")
                })
            }
            "build_validation" -> {
                title = "Validate Desktop TypeScript"
                objective = "Run the allowlisted desktop TypeScript validation command through the Spatial Plan backend after an explicit approval."
                steps.put(JSONObject().apply {
                    put("kind", "build_validation")
                    put("validationProfile", "typecheck")
                    put("title", "Approve and run desktop typecheck")
                    put("detail", "Runs only the backend-allowlisted pnpm run typecheck profile.")
                })
            }
            "host_api" -> {
                title = "Query Gateway Health"
                objective = "Retrieve health status of the gateway using the local Host API dispatcher"
                steps.put(JSONObject().apply {
                    put("kind", "host_api")
                    put("title", "Query Gateway Health API")
                    put("detail", "GET /api/gateway/health")
                })
            }
            "browser" -> {
                title = "Verify Board Reachability"
                objective = "Open the public board URL in a headless browser and verify its title"
                steps.put(JSONObject().apply {
                    put("kind", "browser")
                    put("title", "Verify board.private-driver.ro title")
                    put("detail", JSONObject().apply {
                        put("url", "https://board.private-driver.ro/?board=728273ef-9709-4f1c-a77e-ab7086bfeff3")
                        put("evaluate", "document.title")
                    }.toString())
                })
            }
            else -> {
                Log.w("SpatialFragment", "createQuickPlan: unknown kind=$kind")
                progressSpatial.visibility = View.GONE
                return
            }
        }

        Log.d("SpatialFragment", "createQuickPlan: invoking ApiClient.createPlan title=$title")
        ApiClient.createPlan(ctx, title, objective, steps) { success, error ->
            activity?.runOnUiThread {
                progressSpatial.visibility = View.GONE
                if (success) {
                    Log.d("SpatialFragment", "createQuickPlan success for kind=$kind")
                    Toast.makeText(ctx, "Plan creat cu succes!", Toast.LENGTH_SHORT).show()
                    loadAllData()
                } else {
                    Log.e("SpatialFragment", "createQuickPlan error for kind=$kind: ${error?.message}", error)
                    Toast.makeText(ctx, "Eroare creare plan: ${error?.localizedMessage}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
