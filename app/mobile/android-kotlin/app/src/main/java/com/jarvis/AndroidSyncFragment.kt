package com.jarvis

import android.content.Context
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import org.json.JSONArray
import org.json.JSONObject
import java.util.Date

class AndroidSyncFragment : Fragment() {
    private lateinit var hostUrlInput: EditText
    private lateinit var pairingCodeInput: EditText
    private lateinit var tokenStatusText: TextView
    private lateinit var statusText: TextView
    private lateinit var lastSyncText: TextView
    private lateinit var errorText: TextView
    private lateinit var boardText: TextView
    private lateinit var agentsText: TextView
    private lateinit var tasksText: TextView
    private lateinit var loading: ProgressBar
    private lateinit var btnSaveHost: Button
    private lateinit var btnUseEmulatorHost: Button
    private lateinit var btnPair: Button
    private lateinit var btnTestConnection: Button
    private lateinit var btnSyncNow: Button
    private lateinit var btnPushEvent: Button

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_android_sync, container, false)

        hostUrlInput = view.findViewById(R.id.androidHostUrl)
        pairingCodeInput = view.findViewById(R.id.androidPairingCode)
        tokenStatusText = view.findViewById(R.id.androidTokenStatus)
        statusText = view.findViewById(R.id.androidStatusText)
        lastSyncText = view.findViewById(R.id.androidLastSyncText)
        errorText = view.findViewById(R.id.androidErrorText)
        boardText = view.findViewById(R.id.androidBoardText)
        agentsText = view.findViewById(R.id.androidAgentsText)
        tasksText = view.findViewById(R.id.androidTasksText)
        loading = view.findViewById(R.id.androidSyncLoading)
        btnSaveHost = view.findViewById(R.id.btnSaveAndroidHost)
        btnUseEmulatorHost = view.findViewById(R.id.btnUseEmulatorHost)
        btnPair = view.findViewById(R.id.btnPairAndroid)
        btnTestConnection = view.findViewById(R.id.btnTestAndroidConnection)
        btnSyncNow = view.findViewById(R.id.btnSyncAndroidNow)
        btnPushEvent = view.findViewById(R.id.btnPushAndroidEvent)

        loadLocalState()

        btnSaveHost.setOnClickListener { saveHostUrl() }
        btnUseEmulatorHost.setOnClickListener {
            hostUrlInput.setText(ApiClient.EMULATOR_HOST_API_URL)
            saveHostUrl()
        }
        btnPair.setOnClickListener { pairDevice() }
        btnTestConnection.setOnClickListener { testConnection() }
        btnSyncNow.setOnClickListener { syncNow() }
        btnPushEvent.setOnClickListener { pushHeartbeatEvent() }

        return view
    }

    private fun prefs() = requireContext().getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)

    private fun loadLocalState() {
        val ctx = context ?: return
        val prefs = prefs()
        hostUrlInput.setText(ApiClient.getBaseUrl(ctx))
        val token = ApiClient.getToken(ctx)
        tokenStatusText.text = when {
            token.startsWith("nca_") -> "Pairing token salvat local"
            token.isNotBlank() -> "Gateway token legacy salvat"
            else -> "Neperecheat"
        }
        statusText.text = prefs.getString("android_connection_status", "Offline")
        lastSyncText.text = prefs.getString("android_last_sync_at", "Niciun sync")
        errorText.text = prefs.getString("android_last_error", "")
        boardText.text = prefs.getString("android_cached_board", "Board neincarcat")
        agentsText.text = prefs.getString("android_cached_agents", "Agenti neincarcati")
        tasksText.text = prefs.getString("android_cached_tasks", "Taskuri neincarcate")
    }

    private fun setLoading(active: Boolean) {
        loading.visibility = if (active) View.VISIBLE else View.GONE
        btnTestConnection.isEnabled = !active
        btnSyncNow.isEnabled = !active
        btnPair.isEnabled = !active
        btnPushEvent.isEnabled = !active
    }

    private fun saveHostUrl() {
        val ctx = context ?: return
        val normalized = ApiClient.saveHostApiUrl(ctx, hostUrlInput.text.toString())
        hostUrlInput.setText(normalized)
        Toast.makeText(ctx, "Host API salvat: $normalized", Toast.LENGTH_SHORT).show()
    }

    private fun pairDevice() {
        val ctx = context ?: return
        val code = pairingCodeInput.text.toString().trim()
        if (code.isBlank()) {
            Toast.makeText(ctx, "Introdu codul de pairing din NiClaw Desktop.", Toast.LENGTH_SHORT).show()
            return
        }

        setLoading(true)
        val deviceName = "Android ${Build.MANUFACTURER} ${Build.MODEL}".trim()
        ApiClient.pairAndroid(ctx, code, deviceName) { response, error ->
            activity?.runOnUiThread {
                setLoading(false)
                if (error != null || response == null) {
                    renderError("Pairing esuat: ${error?.message ?: "raspuns gol"}")
                    return@runOnUiThread
                }

                pairingCodeInput.setText("")
                prefs().edit()
                    .putString("android_connection_status", "Paired")
                    .putString("android_last_error", "")
                    .apply()
                renderStatus(response)
                Toast.makeText(ctx, "Android Companion este imperecheat.", Toast.LENGTH_SHORT).show()
                testConnection()
            }
        }
    }

    private fun testConnection() {
        val ctx = context ?: return
        setLoading(true)
        statusText.text = "Se verifica Host API..."
        ApiClient.getAndroidStatus(ctx) { response, error ->
            activity?.runOnUiThread {
                setLoading(false)
                if (error != null || response == null) {
                    prefs().edit()
                        .putString("android_connection_status", "Offline")
                        .putString("android_last_error", error?.message ?: "Raspuns gol")
                        .apply()
                    renderError("Conexiune esuata: ${error?.message ?: "raspuns gol"}")
                    return@runOnUiThread
                }

                prefs().edit()
                    .putString("android_connection_status", "Online")
                    .putString("android_last_error", "")
                    .putString("android_cached_board", summarizeBoard(response.optJSONObject("board")))
                    .putString("android_cached_agents", summarizeAgentsSummary(response.optJSONObject("agents")))
                    .putString("android_cached_tasks", summarizeTasksSummary(response.optJSONObject("tasks")))
                    .apply()
                renderStatus(response)
            }
        }
    }

    private fun syncNow() {
        val ctx = context ?: return
        setLoading(true)
        statusText.text = "Sync in curs..."
        ApiClient.syncAndroid(ctx, true) { response, error ->
            activity?.runOnUiThread {
                setLoading(false)
                if (error != null || response == null) {
                    renderError("Sync esuat: ${error?.message ?: "raspuns gol"}")
                    return@runOnUiThread
                }

                val syncedAt = response.optString("syncedAt", Date().toString())
                prefs().edit()
                    .putString("android_connection_status", "Online")
                    .putString("android_last_sync_at", syncedAt)
                    .putString("android_last_error", "")
                    .putString("android_cached_board", summarizeBoard(response.optJSONObject("board")))
                    .putString("android_cached_agents", summarizeAgentsSnapshot(response.optJSONObject("agents")))
                    .putString("android_cached_tasks", summarizeTasksArray(response.optJSONArray("tasks")))
                    .apply()
                renderSync(response)
                Toast.makeText(ctx, "Sync finalizat.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun pushHeartbeatEvent() {
        val ctx = context ?: return
        setLoading(true)
        val payload = JSONObject().apply {
            put("screen", "android-sync")
            put("hostUrl", ApiClient.getBaseUrl(ctx))
            put("createdAt", Date().toString())
        }

        ApiClient.sendAndroidEvent(ctx, "heartbeat", payload) { response, error ->
            activity?.runOnUiThread {
                setLoading(false)
                if (error != null || response == null) {
                    renderError("Event esuat: ${error?.message ?: "raspuns gol"}")
                    return@runOnUiThread
                }
                statusText.text = "Event acceptat de Desktop"
                errorText.text = ""
                Toast.makeText(ctx, "Heartbeat trimis catre NiClaw Desktop.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun renderStatus(response: JSONObject) {
        tokenStatusText.text = if (ApiClient.getToken(requireContext()).startsWith("nca_")) {
            "Pairing token activ"
        } else {
            "Token legacy sau lipsa pairing"
        }
        statusText.text = if (response.optBoolean("online", false) || response.optBoolean("success", false)) {
            "Online"
        } else {
            "Offline"
        }
        lastSyncText.text = prefs().getString("android_last_sync_at", "Niciun sync")
        errorText.text = ""
        boardText.text = summarizeBoard(response.optJSONObject("board"))
        agentsText.text = summarizeAgentsSummary(response.optJSONObject("agents"))
        tasksText.text = summarizeTasksSummary(response.optJSONObject("tasks"))
    }

    private fun renderSync(response: JSONObject) {
        tokenStatusText.text = "Pairing token activ"
        statusText.text = "Online"
        lastSyncText.text = response.optString("syncedAt", prefs().getString("android_last_sync_at", "Niciun sync") ?: "Niciun sync")
        errorText.text = ""
        boardText.text = summarizeBoard(response.optJSONObject("board"))
        agentsText.text = summarizeAgentsSnapshot(response.optJSONObject("agents"))
        tasksText.text = summarizeTasksArray(response.optJSONArray("tasks"))
    }

    private fun renderError(message: String) {
        statusText.text = "Offline / eroare"
        errorText.text = message
        tokenStatusText.text = if (ApiClient.getToken(requireContext()).isBlank()) "Neperecheat" else tokenStatusText.text
        Toast.makeText(context, message, Toast.LENGTH_LONG).show()
    }

    private fun summarizeBoard(board: JSONObject?): String {
        if (board == null) return "Board indisponibil"
        val snapshot = board.optJSONObject("snapshot")
        val revision = board.optInt("revision", -1)
        val nodes = snapshot?.optInt("nodeCount", board.optInt("nodeCount", 0)) ?: board.optInt("nodeCount", 0)
        val arrows = snapshot?.optInt("arrowCount", board.optInt("arrowCount", 0)) ?: board.optInt("arrowCount", 0)
        val syncAt = board.optString("local_synced_at", board.optString("localSyncedAt", board.optString("synced_at", "necunoscut")))
        val publish = board.optString("publish_status", board.optString("publishStatus", "necunoscut"))
        return "Revizie: $revision\nNoduri: $nodes\nLegaturi: $arrows\nSync: $syncAt\nPublish: $publish"
    }

    private fun summarizeAgentsSummary(agents: JSONObject?): String {
        if (agents == null) return "Agenti indisponibili"
        return "Total agenti: ${agents.optInt("total", 0)}\nDefault: ${agents.optString("defaultAgentId", "-")}"
    }

    private fun summarizeAgentsSnapshot(agents: JSONObject?): String {
        if (agents == null) return "Agenti indisponibili"
        val array = agents.optJSONArray("agents") ?: return summarizeAgentsSummary(agents)
        if (array.length() == 0) return "Niciun agent configurat"
        val lines = mutableListOf<String>()
        for (i in 0 until minOf(array.length(), 8)) {
            val item = array.optJSONObject(i) ?: continue
            val paused = if (item.optBoolean("paused", false)) "paused" else "active"
            lines.add("${item.optString("name", item.optString("id", "agent"))} - $paused")
        }
        if (array.length() > 8) lines.add("+${array.length() - 8} agenti")
        return lines.joinToString("\n")
    }

    private fun summarizeTasksSummary(tasks: JSONObject?): String {
        if (tasks == null) return "Taskuri indisponibile"
        return "Total: ${tasks.optInt("total", 0)}\nTodo: ${tasks.optInt("todo", 0)}\nIn lucru: ${tasks.optInt("inProgress", 0)}\nDone: ${tasks.optInt("done", 0)}"
    }

    private fun summarizeTasksArray(tasks: JSONArray?): String {
        if (tasks == null) return "Taskuri indisponibile"
        if (tasks.length() == 0) return "Niciun task"
        val lines = mutableListOf<String>()
        for (i in 0 until minOf(tasks.length(), 8)) {
            val item = tasks.optJSONObject(i) ?: continue
            lines.add("${item.optString("title", item.optString("id", "task"))} - ${item.optString("status", "todo")}")
        }
        if (tasks.length() > 8) lines.add("+${tasks.length() - 8} taskuri")
        return lines.joinToString("\n")
    }
}
