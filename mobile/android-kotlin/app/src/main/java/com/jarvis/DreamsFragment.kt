package com.jarvis

import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import android.graphics.Color
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.widget.SwitchCompat
import androidx.fragment.app.Fragment
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class DreamsFragment : Fragment() {

    private val DIARY_START_MARKER = "<!-- openclaw:dreaming:diary:start -->"
    private val DIARY_END_MARKER = "<!-- openclaw:dreaming:diary:end -->"

    private lateinit var switchDreaming: SwitchCompat
    private lateinit var txtValShortTerm: TextView
    private lateinit var txtValGrounded: TextView
    private lateinit var txtValTotalSignals: TextView
    private lateinit var txtValPromoted: TextView

    private lateinit var btnBackfill: Button
    private lateinit var btnDedupe: Button
    private lateinit var btnRepair: Button
    private lateinit var btnResetGrounded: Button
    private lateinit var btnResetDiary: Button

    private lateinit var layoutPhases: LinearLayout
    private lateinit var layoutSignals: LinearLayout
    private lateinit var layoutDiary: LinearLayout

    private lateinit var txtNoSignals: TextView
    private lateinit var txtNoDiary: TextView

    private lateinit var fabAddSignal: com.google.android.material.floatingactionbutton.FloatingActionButton
    private lateinit var layoutEmergingTopics: LinearLayout
    private lateinit var txtNoEmergingTopics: TextView
    private lateinit var btnStartDreaming: Button

    private lateinit var layoutReviewQueue: LinearLayout
    private lateinit var txtNoReviewQueue: TextView
    private lateinit var txtGraphStats: TextView
    private lateinit var layoutSuggestedConnections: LinearLayout
    private lateinit var layoutKnowledgeGaps: LinearLayout
    private lateinit var layoutPotentialProjects: LinearLayout
    private lateinit var layoutPotentialTasks: LinearLayout

    private lateinit var btnRunPromotions: Button
    private lateinit var layoutPromotions: LinearLayout
    private lateinit var txtNoPromotions: TextView
    private lateinit var layoutRecurringConnections: LinearLayout
    private lateinit var layoutPermanentCandidates: LinearLayout

    private lateinit var btnBack: ImageButton
    private lateinit var btnRefresh: ImageButton
    private lateinit var progressLoading: ProgressBar

    private var isUpdatingSwitch = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_dreams, container, false)

        switchDreaming = view.findViewById(R.id.switchDreaming)
        txtValShortTerm = view.findViewById(R.id.txtValShortTerm)
        txtValGrounded = view.findViewById(R.id.txtValGrounded)
        txtValTotalSignals = view.findViewById(R.id.txtValTotalSignals)
        txtValPromoted = view.findViewById(R.id.txtValPromoted)

        btnBackfill = view.findViewById(R.id.btnBackfill)
        btnDedupe = view.findViewById(R.id.btnDedupe)
        btnRepair = view.findViewById(R.id.btnRepair)
        btnResetGrounded = view.findViewById(R.id.btnResetGrounded)
        btnResetDiary = view.findViewById(R.id.btnResetDiary)

        layoutPhases = view.findViewById(R.id.layoutPhases)
        layoutSignals = view.findViewById(R.id.layoutSignals)
        layoutDiary = view.findViewById(R.id.layoutDiary)

        txtNoSignals = view.findViewById(R.id.txtNoSignals)
        txtNoDiary = view.findViewById(R.id.txtNoDiary)

        fabAddSignal = view.findViewById(R.id.fabAddSignal)
        layoutEmergingTopics = view.findViewById(R.id.layoutEmergingTopics)
        txtNoEmergingTopics = view.findViewById(R.id.txtNoEmergingTopics)
        btnStartDreaming = view.findViewById(R.id.btnStartDreaming)

        layoutReviewQueue = view.findViewById(R.id.layoutReviewQueue)
        txtNoReviewQueue = view.findViewById(R.id.txtNoReviewQueue)
        txtGraphStats = view.findViewById(R.id.txtGraphStats)
        layoutSuggestedConnections = view.findViewById(R.id.layoutSuggestedConnections)
        layoutKnowledgeGaps = view.findViewById(R.id.layoutKnowledgeGaps)
        layoutPotentialProjects = view.findViewById(R.id.layoutPotentialProjects)
        layoutPotentialTasks = view.findViewById(R.id.layoutPotentialTasks)

        btnRunPromotions = view.findViewById(R.id.btnRunPromotions)
        layoutPromotions = view.findViewById(R.id.layoutPromotions)
        txtNoPromotions = view.findViewById(R.id.txtNoPromotions)
        layoutRecurringConnections = view.findViewById(R.id.layoutRecurringConnections)
        layoutPermanentCandidates = view.findViewById(R.id.layoutPermanentCandidates)

        btnBack = view.findViewById(R.id.btnBack)
        btnRefresh = view.findViewById(R.id.btnRefresh)
        progressLoading = view.findViewById(R.id.loadingProgress)

        // Setup Header buttons
        btnBack.setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        btnRefresh.setOnClickListener {
            loadDreamsState()
        }

        fabAddSignal.setOnClickListener {
            showAddSignalDialog()
        }

        btnStartDreaming.setOnClickListener {
            runDreamCycle()
        }

        btnRunPromotions.setOnClickListener {
            runMemoryPromotion()
        }

        // Setup Dreaming switch
        switchDreaming.setOnCheckedChangeListener { _, isChecked ->
            if (!isUpdatingSwitch) {
                setDreamingEnabled(isChecked)
            }
        }

        // Setup Doctor Action Buttons
        btnBackfill.setOnClickListener { runDoctorAction("backfill", "Backfill Dream Diary", "Dorești să rulezi backfill pentru jurnalul de visare?", false) }
        btnDedupe.setOnClickListener { runDoctorAction("dedupe", "Deduplicate Diary", "Dorești să elimini intrările duplicat din jurnal?", false) }
        btnRepair.setOnClickListener { runDoctorAction("repair", "Repair Artifacts", "Dorești să repari structurile de date de visare deteriorate?", false) }
        btnResetGrounded.setOnClickListener { runDoctorAction("resetGrounded", "Reset Grounded Memory", "Atenție! Această acțiune va șterge toate semnalele short-term stabilizate din memorie. Continui?", true) }
        btnResetDiary.setOnClickListener { runDoctorAction("resetDiary", "Reset Dream Diary", "Atenție! Această acțiune va șterge complet fișierul DREAMS.md. Această operațiune este ireversibilă! Continui?", true) }

        loadDreamsState()

        return view
    }

    private fun loadDreamsState() {
        val ctx = context ?: return
        progressLoading.visibility = View.VISIBLE

        // RPC call 1: doctor.memory.status
        ApiClient.gatewayRpc(ctx, "doctor.memory.status", null) { statusResponse, errorStatus ->
            if (errorStatus != null) {
                activity?.runOnUiThread {
                    progressLoading.visibility = View.GONE
                    Toast.makeText(ctx, "Eroare status: ${errorStatus.message}", Toast.LENGTH_LONG).show()
                    Log.e("DreamsFragment", "doctor.memory.status failed", errorStatus)
                }
                return@gatewayRpc
            }

            // Attempt new Diary endpoint first, fallback to RPC
            ApiClient.getDreamDiary(ctx) { newDiaryResponse, err ->
                if (err == null && newDiaryResponse?.optBoolean("success") == true) {
                    fetchInsightsAndRender(ctx, statusResponse, newDiaryResponse)
                } else {
                    ApiClient.gatewayRpc(ctx, "doctor.memory.dreamDiary", null) { diaryResponse, errorDiary ->
                        activity?.runOnUiThread {
                            if (errorDiary != null) {
                                Toast.makeText(ctx, "Eroare jurnal fallback: ${errorDiary.message}", Toast.LENGTH_LONG).show()
                            }
                            fetchInsightsAndRender(ctx, statusResponse, diaryResponse)
                        }
                    }
                }
            }
        }
    }

    private fun fetchInsightsAndRender(ctx: Context, statusResponse: JSONObject?, diaryResponse: JSONObject?) {
        ApiClient.getDreamInsights(ctx) { insightsRes, _ ->
            ApiClient.getDreamQueue(ctx) { queueRes, _ ->
                ApiClient.getDreamGraph(ctx) { graphRes, _ ->
                    ApiClient.getDreamPromotions(ctx) { promoRes, _ ->
                        activity?.runOnUiThread {
                            progressLoading.visibility = View.GONE
                            updateUi(statusResponse, diaryResponse, insightsRes, queueRes, graphRes, promoRes)
                        }
                    }
                }
            }
        }
    }

    private fun runDreamCycle() {
        val ctx = context ?: return
        progressLoading.visibility = View.VISIBLE
        ApiClient.postDreamRun(ctx) { response, error ->
            activity?.runOnUiThread {
                progressLoading.visibility = View.GONE
                if (error != null) {
                    Toast.makeText(ctx, "Eroare rulare: ${error.message}", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(ctx, "Ciclul de consolidare s-a încheiat!", Toast.LENGTH_SHORT).show()
                    loadDreamsState()
                }
            }
        }
    }

    private fun showAddSignalDialog() {
        val ctx = context ?: return
        val input = EditText(ctx).apply {
            hint = "Introduceți gândul/semnalul de visare..."
            setLines(3)
            setPadding(32, 32, 32, 32)
        }
        AlertDialog.Builder(ctx)
            .setTitle("Adaugă Semnal Dream Seed")
            .setView(input)
            .setPositiveButton("Trimite") { _, _ ->
                val content = input.text.toString().trim()
                if (content.isNotEmpty()) {
                    sendDreamSignal(content)
                }
            }
            .setNegativeButton("Anulare", null)
            .show()
    }

    private fun sendDreamSignal(content: String) {
        val ctx = context ?: return
        progressLoading.visibility = View.VISIBLE
        val payload = JSONObject().apply {
            put("content", content)
            put("type", "dreamSeed")
            put("source", "mobile")
        }
        ApiClient.postDreamSignal(ctx, payload) { response, error ->
            activity?.runOnUiThread {
                progressLoading.visibility = View.GONE
                if (error != null) {
                    Toast.makeText(ctx, "Eroare trimitere: ${error.message}", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(ctx, "Semnal trimis cu succes!", Toast.LENGTH_SHORT).show()
                    loadDreamsState()
                }
            }
        }
    }

    private fun runMemoryPromotion() {
        val ctx = context ?: return
        progressLoading.visibility = View.VISIBLE
        ApiClient.postDreamPromotionRun(ctx) { response, error ->
            activity?.runOnUiThread {
                progressLoading.visibility = View.GONE
                if (error != null) {
                    Toast.makeText(ctx, "Eroare promotion: ${error.message}", Toast.LENGTH_LONG).show()
                } else {
                    Toast.makeText(ctx, "Memory Promotion Run Finalizat!", Toast.LENGTH_SHORT).show()
                    loadDreamsState()
                }
            }
        }
    }

    private fun updateUi(
        statusRes: JSONObject?, 
        diaryRes: JSONObject?, 
        insightsRes: JSONObject?, 
        queueRes: JSONObject? = null,
        graphRes: JSONObject? = null,
        promoRes: JSONObject? = null
    ) {
        val ctx = context ?: return
        
        // 1. Status processing
        val result = statusRes?.optJSONObject("result") ?: statusRes
        val dreaming = result?.optJSONObject("dreaming") ?: result
        val isEnabled = dreaming?.optBoolean("enabled", false) ?: false
        
        isUpdatingSwitch = true
        switchDreaming.isChecked = isEnabled
        isUpdatingSwitch = false

        // Metrics
        txtValShortTerm.text = dreaming?.optInt("shortTermCount", 0).toString()
        txtValGrounded.text = dreaming?.optInt("groundedSignalCount", 0).toString()
        txtValTotalSignals.text = dreaming?.optInt("totalSignalCount", 0).toString()
        txtValPromoted.text = dreaming?.optInt("promotedToday", 0).toString()

        // 2. Render Dreaming Phases
        layoutPhases.removeAllViews()
        val phases = dreaming?.optJSONObject("phases")
        if (phases != null) {
            val phaseKeys = arrayOf("light", "rem", "deep")
            val phaseLabels = mapOf("light" to "Light Phase", "rem" to "REM Phase", "deep" to "Deep Phase")
            for (key in phaseKeys) {
                val phaseObj = phases.optJSONObject(key) ?: continue
                val phaseEnabled = phaseObj.optBoolean("enabled", false)
                val cron = phaseObj.optString("cron", "N/A")
                val nextRunAtMs = phaseObj.optLong("nextRunAtMs", 0L)

                val phaseView = LayoutInflater.from(ctx).inflate(R.layout.item_dream_phase, layoutPhases, false)
                val txtPhaseName = phaseView.findViewById<TextView>(R.id.txtPhaseName)
                val txtPhaseCron = phaseView.findViewById<TextView>(R.id.txtPhaseCron)
                val badgePhaseEnabled = phaseView.findViewById<TextView>(R.id.badgePhaseEnabled)
                val txtPhaseNextRun = phaseView.findViewById<TextView>(R.id.txtPhaseNextRun)

                txtPhaseName.text = phaseLabels[key] ?: key.uppercase()
                txtPhaseCron.text = "Cron: $cron"
                
                badgePhaseEnabled.text = if (phaseEnabled) "ACTIV" else "INACTIV"
                badgePhaseEnabled.setTextColor(if (phaseEnabled) 0xFF0A0D14.toInt() else 0xFFFFFFFF.toInt())
                badgePhaseEnabled.setBackgroundColor(if (phaseEnabled) 0xFF00E5FF.toInt() else 0xFF5E6D8C.toInt())

                txtPhaseNextRun.text = if (nextRunAtMs > 0) "Next: ${formatDateTime(nextRunAtMs)}" else "Programare indisponibilă"

                layoutPhases.addView(phaseView)
            }
        }

        // 3. Render Recent Signals
        layoutSignals.removeAllViews()
        val shortTerm = dreaming?.optJSONArray("shortTermEntries") ?: org.json.JSONArray()
        val promoted = dreaming?.optJSONArray("promotedEntries") ?: org.json.JSONArray()

        val combinedSignals = mutableListOf<JSONObject>()
        for (i in 0 until shortTerm.length()) { combinedSignals.add(shortTerm.getJSONObject(i)) }
        for (i in 0 until promoted.length()) { combinedSignals.add(promoted.getJSONObject(i)) }

        val displaySignals = combinedSignals.take(6)
        if (displaySignals.isEmpty()) {
            txtNoSignals.visibility = View.VISIBLE
        } else {
            txtNoSignals.visibility = View.GONE
            for (sig in displaySignals) {
                val path = sig.optString("path", sig.optString("key", "Sursă necunoscută"))
                val startLine = sig.optInt("startLine", 0)
                val hits = sig.optInt("totalSignalCount", sig.optInt("phaseHitCount", 1))
                val snippet = sig.optString("snippet", "(snippet indisponibil)")

                val sigView = LayoutInflater.from(ctx).inflate(R.layout.item_dream_signal, layoutSignals, false)
                val txtSignalSource = sigView.findViewById<TextView>(R.id.txtSignalSource)
                val badgeSignalHits = sigView.findViewById<TextView>(R.id.badgeSignalHits)
                val txtSignalSnippet = sigView.findViewById<TextView>(R.id.txtSignalSnippet)

                txtSignalSource.text = if (startLine > 0) "$path:$startLine" else path
                badgeSignalHits.text = "$hits hits"
                txtSignalSnippet.text = snippet

                layoutSignals.addView(sigView)
            }
        }

        // 4. Render Dream Diary
        layoutDiary.removeAllViews()
        if (diaryRes != null) {
            val diaryResult = diaryRes.optJSONObject("result") ?: diaryRes
            val diaryContent = diaryResult.optString("content", "")
            val parsedEntries = parseDreamDiary(diaryContent).take(4)

            if (parsedEntries.isEmpty()) {
                txtNoDiary.visibility = View.VISIBLE
            } else {
                txtNoDiary.visibility = View.GONE
                for (entry in parsedEntries) {
                    val diaryView = LayoutInflater.from(ctx).inflate(R.layout.item_dream_diary, layoutDiary, false)
                    val txtDiaryDate = diaryView.findViewById<TextView>(R.id.txtDiaryDate)
                    val txtDiarySummary = diaryView.findViewById<TextView>(R.id.txtDiarySummary)

                    txtDiaryDate.text = entry.date
                    txtDiarySummary.text = entry.summary

                    layoutDiary.addView(diaryView)
                }
            }
        } else {
            txtNoDiary.visibility = View.VISIBLE
        }

        // 5. Emerging Topics Card (Legacy for V1 layout)
        layoutEmergingTopics.removeAllViews()
        if (insightsRes != null && insightsRes.optBoolean("success")) {
            val insights = insightsRes.optJSONObject("insights")
            val topics = insights?.optJSONArray("emergingTopics")
            if (topics != null && topics.length() > 0) {
                txtNoEmergingTopics.visibility = View.GONE
                for (i in 0 until topics.length()) {
                    val topicObj = topics.optJSONObject(i) ?: continue
                    val topicName = topicObj.optString("topic", "Subiect necunoscut")
                    val score = topicObj.optInt("score", 0)
                    
                    val tv = TextView(ctx).apply {
                        text = "• $topicName (Score: $score)"
                        setTextColor(0xFFE5E7EB.toInt())
                        textSize = 13f
                        setPadding(0, 4, 0, 4)
                    }
                    layoutEmergingTopics.addView(tv)
                }
            } else {
                txtNoEmergingTopics.visibility = View.VISIBLE
            }
        } else {
            txtNoEmergingTopics.visibility = View.VISIBLE
        }

        renderQueue(queueRes)
        renderPromotions(promoRes)
        renderGraphAndDiscovery(insightsRes, graphRes, promoRes)
    }

    private fun renderQueue(queueRes: JSONObject?) {
        val queueArr = queueRes?.optJSONArray("result")
        layoutReviewQueue.removeAllViews()
        
        if (queueArr == null || queueArr.length() == 0) {
            txtNoReviewQueue.visibility = View.VISIBLE
            layoutReviewQueue.visibility = View.GONE
            return
        }

        txtNoReviewQueue.visibility = View.GONE
        layoutReviewQueue.visibility = View.VISIBLE
        
        val ctx = context ?: return
        var pendingCount = 0

        for (i in 0 until queueArr.length()) {
            val item = queueArr.optJSONObject(i) ?: continue
            val status = item.optString("status", "")
            if (status != "pending") continue
            
            pendingCount++
            val id = item.optString("id")
            val title = item.optString("title")
            val content = item.optString("content")
            
            val container = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, 0, 0, 24)
            }
            
            val tvTitle = TextView(ctx).apply {
                text = title
                setTextColor(Color.parseColor("#FBBF24"))
                setTypeface(null, android.graphics.Typeface.BOLD)
                textSize = 14f
            }
            
            val tvContent = TextView(ctx).apply {
                text = content
                setTextColor(Color.parseColor("#D1D5DB"))
                textSize = 13f
                setPadding(0, 8, 0, 8)
            }
            
            val btnRow = LinearLayout(ctx).apply {
                orientation = LinearLayout.HORIZONTAL
            }
            
            val btnApprove = Button(ctx).apply {
                text = "Approve"
                setOnClickListener {
                    ApiClient.postDreamQueueApprove(ctx, id) { _, _ -> activity?.runOnUiThread { loadDreamsState() } }
                }
            }
            val btnReject = Button(ctx).apply {
                text = "Reject"
                setOnClickListener {
                    ApiClient.postDreamQueueReject(ctx, id) { _, _ -> activity?.runOnUiThread { loadDreamsState() } }
                }
            }
            
            btnRow.addView(btnApprove)
            btnRow.addView(btnReject)
            
            container.addView(tvTitle)
            container.addView(tvContent)
            container.addView(btnRow)
            
            layoutReviewQueue.addView(container)
        }
        
        if (pendingCount == 0) {
            txtNoReviewQueue.visibility = View.VISIBLE
            layoutReviewQueue.visibility = View.GONE
        }
    }

    private fun renderPromotions(promoRes: JSONObject?) {
        val itemsArr = promoRes?.optJSONObject("result")?.optJSONArray("items")
        layoutPromotions.removeAllViews()
        
        if (itemsArr == null || itemsArr.length() == 0) {
            txtNoPromotions.visibility = View.VISIBLE
            layoutPromotions.visibility = View.GONE
            return
        }

        val ctx = context ?: return
        var activeCount = 0

        for (i in 0 until itemsArr.length()) {
            val item = itemsArr.optJSONObject(i) ?: continue
            val status = item.optString("status", "")
            if (status != "promoted") continue
            
            activeCount++
            val id = item.optString("id")
            val title = item.optString("title")
            val level = item.optString("level")
            val content = item.optString("content")
            
            val container = LinearLayout(ctx).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, 0, 0, 24)
            }
            
            val tvTitle = TextView(ctx).apply {
                text = "[$level] $title"
                setTextColor(Color.parseColor("#8B5CF6"))
                setTypeface(null, android.graphics.Typeface.BOLD)
                textSize = 14f
            }
            
            val tvContent = TextView(ctx).apply {
                text = content
                setTextColor(Color.parseColor("#D1D5DB"))
                textSize = 13f
                setPadding(0, 8, 0, 8)
            }
            
            val btnRow = LinearLayout(ctx).apply {
                orientation = LinearLayout.HORIZONTAL
            }
            
            val btnAccept = Button(ctx).apply {
                text = "Accept"
                setOnClickListener {
                    ApiClient.postDreamPromotionAccept(ctx, id) { _, _ -> activity?.runOnUiThread { loadDreamsState() } }
                }
            }
            val btnReject = Button(ctx).apply {
                text = "Reject"
                setOnClickListener {
                    ApiClient.postDreamPromotionReject(ctx, id) { _, _ -> activity?.runOnUiThread { loadDreamsState() } }
                }
            }
            
            btnRow.addView(btnAccept)
            btnRow.addView(btnReject)
            
            container.addView(tvTitle)
            container.addView(tvContent)
            container.addView(btnRow)
            
            layoutPromotions.addView(container)
        }
        
        if (activeCount == 0) {
            txtNoPromotions.visibility = View.VISIBLE
            layoutPromotions.visibility = View.GONE
        } else {
            txtNoPromotions.visibility = View.GONE
            layoutPromotions.visibility = View.VISIBLE
        }
    }

    private fun renderGraphAndDiscovery(insightsRes: JSONObject?, graphRes: JSONObject?, promoRes: JSONObject?) {
        val ctx = context ?: return
        
        // Graph Stats
        val nodesArr = graphRes?.optJSONObject("result")?.optJSONArray("nodes")
        val edgesArr = graphRes?.optJSONObject("result")?.optJSONArray("edges")
        txtGraphStats.text = "Graph: ${nodesArr?.length() ?: 0} Nodes, ${edgesArr?.length() ?: 0} Edges"
        
        // Render simple lists for Discovery items
        fun renderList(layout: LinearLayout, arr: org.json.JSONArray?) {
            layout.removeAllViews()
            if (arr != null && arr.length() > 0) {
                for (i in 0 until arr.length()) {
                    val v = arr.opt(i)
                    val str = if (v is JSONObject) v.toString() else v.toString()
                    layout.addView(TextView(ctx).apply {
                        text = "• $str"
                        setTextColor(Color.parseColor("#E5E7EB"))
                        textSize = 13f
                        setPadding(0, 0, 0, 8)
                    })
                }
            } else {
                layout.addView(TextView(ctx).apply { text = "None"; setTextColor(Color.parseColor("#6B7280")); textSize=12f })
            }
        }
        
        val insights = insightsRes?.optJSONObject("insights") ?: insightsRes
        renderList(layoutSuggestedConnections, insights?.optJSONArray("suggestedConnections"))
        renderList(layoutKnowledgeGaps, insights?.optJSONArray("knowledgeGaps"))
        renderList(layoutPotentialProjects, insights?.optJSONArray("potentialProjects"))
        renderList(layoutPotentialTasks, insights?.optJSONArray("potentialTasks"))

        // Recurring Connections
        val recurringList = org.json.JSONArray()
        if (edgesArr != null) {
            for (i in 0 until edgesArr.length()) {
                val edge = edgesArr.optJSONObject(i) ?: continue
                if (edge.optInt("timesReinforced", 0) > 0) {
                    recurringList.put("${edge.optString("source")} -> ${edge.optString("target")} (Strength: ${edge.optDouble("strength", 0.0)})")
                }
            }
        }
        renderList(layoutRecurringConnections, recurringList)

        // Permanent Memory Candidates
        val candidatesList = org.json.JSONArray()
        val promos = promoRes?.optJSONObject("result")?.optJSONArray("items")
        if (promos != null) {
            for (i in 0 until promos.length()) {
                val p = promos.optJSONObject(i) ?: continue
                if (p.optString("level") == "L4" || p.optString("status") == "accepted_for_future_write") {
                    candidatesList.put(p.optString("title"))
                }
            }
        }
        renderList(layoutPermanentCandidates, candidatesList)
    }

    private fun setDreamingEnabled(enabled: Boolean) {
        val ctx = context ?: return
        progressLoading.visibility = View.VISIBLE

        // Step 1: config.get to fetch active base hash
        ApiClient.gatewayRpc(ctx, "config.get", null) { configRes, configErr ->
            if (configErr != null) {
                activity?.runOnUiThread {
                    progressLoading.visibility = View.GONE
                    Toast.makeText(ctx, "Eroare config: ${configErr.message}", Toast.LENGTH_LONG).show()
                    switchDreaming.isChecked = !enabled // revert
                }
                return@gatewayRpc
            }

            val resultObj = configRes?.optJSONObject("result") ?: configRes
            val baseHash = resultObj?.optString("hash", "") ?: ""
            if (baseHash.isEmpty()) {
                activity?.runOnUiThread {
                    progressLoading.visibility = View.GONE
                    Toast.makeText(ctx, "Eroare: Hash config lipsă pe server.", Toast.LENGTH_LONG).show()
                    switchDreaming.isChecked = !enabled // revert
                }
                return@gatewayRpc
            }

            // Step 2: Build Dreaming Enabled Patch
            val patchContent = JSONObject().apply {
                val dreamingObj = JSONObject().apply {
                    put("enabled", enabled)
                }
                val memoryCoreObj = JSONObject().apply {
                    put("config", JSONObject().apply {
                        put("dreaming", dreamingObj)
                    })
                }
                val entriesObj = JSONObject().apply {
                    put("memory-core", memoryCoreObj)
                }
                val pluginsObj = JSONObject().apply {
                    put("entries", entriesObj)
                }
                put("plugins", pluginsObj)
            }

            val patchParams = JSONObject().apply {
                put("raw", patchContent.toString())
                put("baseHash", baseHash)
                put("note", if (enabled) "Enable memory dreaming from Android companion." else "Disable memory dreaming from Android companion.")
            }

            // Step 3: config.patch
            ApiClient.gatewayRpc(ctx, "config.patch", patchParams, 30000) { patchRes, patchErr ->
                activity?.runOnUiThread {
                    progressLoading.visibility = View.GONE
                    if (patchErr != null) {
                        Toast.makeText(ctx, "Eroare patch: ${patchErr.message}", Toast.LENGTH_LONG).show()
                        switchDreaming.isChecked = !enabled // revert
                    } else {
                        Toast.makeText(ctx, "Consolidarea a fost " + (if (enabled) "activată!" else "dezactivată!"), Toast.LENGTH_SHORT).show()
                        loadDreamsState()
                    }
                }
            }
        }
    }

    private fun runDoctorAction(actionKey: String, title: String, message: String, isDestructive: Boolean) {
        val ctx = context ?: return

        AlertDialog.Builder(ctx)
            .setTitle(title)
            .setMessage(message)
            .setIcon(if (isDestructive) android.R.drawable.ic_dialog_alert else android.R.drawable.ic_dialog_info)
            .setPositiveButton("Da") { _, _ ->
                executeDoctorRpc(actionKey)
            }
            .setNegativeButton("Nu", null)
            .show()
    }

    private fun executeDoctorRpc(actionKey: String) {
        val ctx = context ?: return
        progressLoading.visibility = View.VISIBLE

        val methodMap = mapOf(
            "backfill" to "doctor.memory.backfillDreamDiary",
            "dedupe" to "doctor.memory.dedupeDreamDiary",
            "repair" to "doctor.memory.repairDreamingArtifacts",
            "resetDiary" to "doctor.memory.resetDreamDiary",
            "resetGrounded" to "doctor.memory.resetGroundedShortTerm"
        )

        val rpcMethod = methodMap[actionKey] ?: return

        ApiClient.gatewayRpc(ctx, rpcMethod, null, 120000) { response, error ->
            activity?.runOnUiThread {
                progressLoading.visibility = View.GONE
                if (error != null) {
                    Toast.makeText(ctx, "Eroare: ${error.message}", Toast.LENGTH_LONG).show()
                } else {
                    val resultObj = response?.optJSONObject("result") ?: response
                    val feedback = buildActionSuccessMessage(actionKey, resultObj)
                    Toast.makeText(ctx, feedback, Toast.LENGTH_LONG).show()
                    loadDreamsState() // Reload
                }
            }
        }
    }

    private fun buildActionSuccessMessage(actionKey: String, result: JSONObject?): String {
        if (result == null) return "Acțiune executată cu succes."
        
        return when (actionKey) {
            "backfill" -> {
                val count = result.optInt("written", result.optInt("created", result.optInt("count", 0)))
                "Backfill finalizat! S-au scris $count intrări în jurnal."
            }
            "dedupe" -> {
                val removed = result.optInt("removedEntries", result.optInt("removed", result.optInt("duplicatesRemoved", 0)))
                val kept = result.optInt("keptEntries", result.optInt("kept", 0))
                "Eliminare duplicate finalizată! S-au șters $removed duplicări, s-au păstrat $kept intrări."
            }
            "repair" -> "Reparare artefacte finalizată cu succes!"
            "resetDiary" -> {
                val count = result.optInt("removedEntries", result.optInt("removed", 0))
                "Jurnal șters cu succes ($count intrări eliminate)!"
            }
            "resetGrounded" -> {
                val count = result.optInt("removedShortTermEntries", result.optInt("cleared", result.optInt("removed", 0)))
                "Semnale stabilizate șterse cu succes ($count intrări eliminate)!"
            }
            else -> "Acțiune executată."
        }
    }

    private fun formatDateTime(timeMs: Long): String {
        if (timeMs <= 0) return "—"
        return try {
            val sdf = SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.getDefault())
            sdf.format(Date(timeMs))
        } catch (e: Exception) {
            "—"
        }
    }

    private fun parseDreamDiary(content: String?): List<DreamDiaryEntry> {
        if (content == null || content.trim().isEmpty()) return emptyList()

        var body = content
        val start = content.indexOf(DIARY_START_MARKER)
        val end = content.indexOf(DIARY_END_MARKER)
        if (start >= 0 && end > start) {
            body = content.substring(start + DIARY_START_MARKER.length, end)
        }

        val entries = mutableListOf<DreamDiaryEntry>()
        val blocks = body.split(Regex("\\n\\s*---+\\s*\\n"))

        for ((index, block) in blocks.withIndex()) {
            val lines = block.split("\n")
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .filter { !it.startsWith("#") && !it.startsWith("<!--") }
                .filter { !it.equals("What Happened", ignoreCase = true) &&
                          !it.equals("Reflections", ignoreCase = true) &&
                          !it.equals("Candidates", ignoreCase = true) &&
                          !it.equals("Possible Lasting Updates", ignoreCase = true) }
                .map { line ->
                    line.replace(Regex("\\[[^\\]]+\\]"), "")
                        .replace(Regex("^[-*]\\s+"), "")
                        .trim()
                }
                .filter { it.isNotEmpty() }

            if (lines.isEmpty()) continue

            val dateLine = lines.find { it.startsWith("*") && it.endsWith("*") }
            val date = dateLine?.replace("*", "") ?: ""
            val summaryLines = lines.filter { it != dateLine }.take(3)
            val summary = summaryLines.joinToString(" ")

            if (summary.isNotEmpty()) {
                entries.add(DreamDiaryEntry(
                    id = "${date.ifEmpty { "entry" }}-$index",
                    date = date.ifEmpty { "Dată nespecificată" },
                    summary = summary
                ))
            }
        }
        return entries
    }

    data class DreamDiaryEntry(val id: String, val date: String, val summary: String)
}
