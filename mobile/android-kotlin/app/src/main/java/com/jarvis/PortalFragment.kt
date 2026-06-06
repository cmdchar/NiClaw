package com.jarvis

import android.content.ClipboardManager
import android.content.ClipData
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import org.json.JSONObject

class PortalFragment : Fragment() {

    private lateinit var portalWebView: WebView
    private lateinit var urlAddressInput: EditText
    private lateinit var secureIndicator: ImageView
    private lateinit var webProgress: ProgressBar
    private lateinit var zoomLabel: TextView
    private lateinit var btnBack: ImageButton
    private lateinit var btnForward: ImageButton
    private lateinit var btnRefresh: ImageButton
    private lateinit var btnCopyUrl: ImageButton
    private lateinit var btnMute: ImageButton
    private lateinit var btnZoomIn: ImageButton
    private lateinit var btnZoomOut: ImageButton
    private lateinit var boardStatusBar: LinearLayout
    private lateinit var boardStatusLabel: TextView
    private lateinit var btnBoardStatus: Button
    private lateinit var btnBoardSync: Button

    private var activeAgentId = "openclaw"
    private var isMuted = false
    private var zoomPercent = 100

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_portal, container, false)

        portalWebView = view.findViewById(R.id.portalWebView)
        urlAddressInput = view.findViewById(R.id.urlAddressInput)
        secureIndicator = view.findViewById(R.id.secureIndicator)
        webProgress = view.findViewById(R.id.webProgress)
        zoomLabel = view.findViewById(R.id.zoomLabel)

        btnBack = view.findViewById(R.id.btnBack)
        btnForward = view.findViewById(R.id.btnForward)
        btnRefresh = view.findViewById(R.id.btnRefresh)
        btnCopyUrl = view.findViewById(R.id.btnCopyUrl)
        btnMute = view.findViewById(R.id.btnMute)
        btnZoomIn = view.findViewById(R.id.btnZoomIn)
        btnZoomOut = view.findViewById(R.id.btnZoomOut)
        boardStatusBar = view.findViewById(R.id.boardStatusBar)
        boardStatusLabel = view.findViewById(R.id.boardStatusLabel)
        btnBoardStatus = view.findViewById(R.id.btnBoardStatus)
        btnBoardSync = view.findViewById(R.id.btnBoardSync)

        // Setup Agent Buttons
        view.findViewById<Button>(R.id.btnOpenClaw).setOnClickListener { loadAgent("openclaw") }
        view.findViewById<Button>(R.id.btnOpenHuman).setOnClickListener { loadAgent("openhuman") }
        view.findViewById<Button>(R.id.btnHermes).setOnClickListener { loadAgent("hermes") }
        view.findViewById<Button>(R.id.btnOpenCode).setOnClickListener { loadAgent("opencode") }
        view.findViewById<Button>(R.id.btnGemini).setOnClickListener { loadAgent("gemini") }
        view.findViewById<Button>(R.id.btnBoardAi).setOnClickListener { loadAgent("boardai") }

        // Setup Browser Buttons
        btnBack.setOnClickListener { if (portalWebView.canGoBack()) portalWebView.goBack() }
        btnForward.setOnClickListener { if (portalWebView.canGoForward()) portalWebView.goForward() }
        btnRefresh.setOnClickListener { portalWebView.reload() }
        
        btnCopyUrl.setOnClickListener {
            val url = portalWebView.url
            if (!url.isNullOrEmpty()) {
                val clipboard = context?.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                val clip = ClipData.newPlainText("Copied URL", url)
                clipboard?.setPrimaryClip(clip)
                Toast.makeText(context, "URL copiat în clipboard!", Toast.LENGTH_SHORT).show()
            }
        }

        btnMute.setOnClickListener {
            isMuted = !isMuted
            if (isMuted) {
                btnMute.setImageResource(android.R.drawable.ic_lock_silent_mode_off)
                btnMute.setColorFilter(0xFFFF5252.toInt())
                // Execute audio element muting scripts via JavaScript injection
                portalWebView.evaluateJavascript(
                    "document.querySelectorAll('video, audio').forEach(el => el.muted = true);", 
                    null
                )
                Toast.makeText(context, "Audio dezactivat pe pagină", Toast.LENGTH_SHORT).show()
            } else {
                btnMute.setImageResource(android.R.drawable.ic_lock_silent_mode)
                btnMute.setColorFilter(0xFF8892B0.toInt())
                portalWebView.evaluateJavascript(
                    "document.querySelectorAll('video, audio').forEach(el => el.muted = false);", 
                    null
                )
                Toast.makeText(context, "Audio activat pe pagină", Toast.LENGTH_SHORT).show()
            }
        }

        btnZoomIn.setOnClickListener { changeZoom(10) }
        btnZoomOut.setOnClickListener { changeZoom(-10) }
        btnBoardStatus.setOnClickListener { refreshBoardStatus(true) }
        btnBoardSync.setOnClickListener { syncBoardSnapshot() }

        // Setup URL Input submit action
        urlAddressInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_GO || actionId == EditorInfo.IME_ACTION_DONE) {
                var url = urlAddressInput.text.toString().trim()
                if (url.isNotEmpty()) {
                    if (!url.startsWith("http://") && !url.startsWith("https://")) {
                        url = "http://$url"
                    }
                    portalWebView.loadUrl(url)
                }
                true
            } else {
                false
            }
        }

        setupWebView()
        loadAgent(activeAgentId)

        return view
    }

    private fun setupWebView() {
        val settings = portalWebView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        
        portalWebView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null) {
                    view?.loadUrl(url)
                    updateAddressBar(url)
                }
                return true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                if (url != null) {
                    updateAddressBar(url)
                }
                // Auto-apply mute status if active
                if (isMuted) {
                    portalWebView.evaluateJavascript(
                        "document.querySelectorAll('video, audio').forEach(el => el.muted = true);", 
                        null
                    )
                }
            }
        }

        portalWebView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    webProgress.visibility = View.VISIBLE
                    webProgress.progress = newProgress
                } else {
                    webProgress.visibility = View.GONE
                }
            }
        }
    }

    private fun changeZoom(step: Int) {
        zoomPercent = (zoomPercent + step).coerceIn(30, 300)
        zoomLabel.text = "$zoomPercent%"
        portalWebView.settings.textZoom = zoomPercent
    }

    private fun updateAddressBar(url: String) {
        urlAddressInput.setText(url)
        if (url.startsWith("https://")) {
            secureIndicator.setImageResource(android.R.drawable.ic_secure)
            secureIndicator.setColorFilter(0xFF4CAF50.toInt()) // green
        } else {
            secureIndicator.setImageResource(android.R.drawable.ic_partial_secure)
            secureIndicator.setColorFilter(0xFFFFB300.toInt()) // amber
        }
    }

    private fun loadAgent(agentId: String) {
        activeAgentId = agentId
        boardStatusBar.visibility = if (agentId == "boardai") View.VISIBLE else View.GONE
        val url = getAgentUrl(agentId)
        portalWebView.loadUrl(url)
        updateAddressBar(url)
        if (agentId == "boardai") {
            refreshBoardStatus(false)
        }
    }

    private fun refreshBoardStatus(showToast: Boolean) {
        val ctx = context ?: return
        boardStatusLabel.text = "BoardAI status: se verifica..."
        ApiClient.getBoardStatus(ctx) { status, error ->
            activity?.runOnUiThread {
                if (error != null || status == null) {
                    boardStatusLabel.text = "BoardAI status: Host API indisponibil"
                    if (showToast) {
                        Toast.makeText(context, "Nu pot citi BoardAI: ${error?.message}", Toast.LENGTH_SHORT).show()
                    }
                    return@runOnUiThread
                }
                renderBoardStatus(status)
                if (showToast) {
                    Toast.makeText(context, "Status BoardAI actualizat", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun syncBoardSnapshot() {
        val ctx = context ?: return
        boardStatusLabel.text = "BoardAI status: sync local in curs..."
        ApiClient.syncBoard(ctx) { response, error ->
            activity?.runOnUiThread {
                if (error != null || response == null) {
                    boardStatusLabel.text = "BoardAI status: sync esuat"
                    Toast.makeText(context, "Sync BoardAI esuat: ${error?.message}", Toast.LENGTH_SHORT).show()
                    return@runOnUiThread
                }

                val status = response.optJSONObject("status") ?: response
                renderBoardStatus(status)
                val message = response.optString("message", "BoardAI local sync finalizat")
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun renderBoardStatus(status: JSONObject) {
        val snapshot = status.optJSONObject("snapshot")
        val probe = status.optJSONObject("probe")
        val revision = status.optInt("revision", 0)
        val nodeCount = snapshot?.optInt("nodeCount", 0) ?: 0
        val arrowCount = snapshot?.optInt("arrowCount", 0) ?: 0
        val reachable = probe?.optBoolean("reachable", false) ?: false
        val syncAt = status.optString("local_synced_at", status.optString("synced_at", "necunoscut"))
        val publishFlag = if (status.optBoolean("remotePublishConfigured", false)) {
            "publish: ${status.optString("publish_status", "pregatit")}"
        } else {
            "seteaza BOARD_AI_TOKEN"
        }
        val onlineFlag = if (reachable) "online" else "neconfirmat"

        boardStatusLabel.text = "BoardAI $onlineFlag · rev $revision · $nodeCount noduri · $arrowCount legaturi\nSync: $syncAt · $publishFlag"
    }

    private fun getAgentUrl(agentId: String): String {
        val context = context ?: return "https://aistudio.google.com"
        val prefs = context.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
        val serverUrl = prefs.getString("server_url", "ws://10.10.1.219:13210/jarvis/stream")!!
        val gatewayToken = prefs.getString("gateway_token", "35c6ae8e7a685718dfb4a45a1f2982d5")!!
        
        var isHttps = false
        var host = "10.10.1.219"
        
        try {
            val uri = Uri.parse(serverUrl)
            val scheme = uri.scheme
            if (scheme != null) {
                isHttps = scheme.equals("wss", ignoreCase = true) || scheme.equals("https", ignoreCase = true)
            }
            val extractedHost = uri.host
            if (extractedHost != null) {
                host = extractedHost
            }
        } catch (e: Exception) {
            // Fallback
        }

        if (agentId == "gemini") {
            return "https://aistudio.google.com"
        }

        if (agentId == "boardai") {
            return "https://board.private-driver.ro/?board=728273ef-9709-4f1c-a77e-ab7086bfeff3"
        }

        return if (isHttps) {
            when (agentId) {
                "openclaw" -> "https://$host/?token=$gatewayToken"
                "openhuman" -> "https://$host:10000"
                "hermes" -> "https://$host:8443"
                "opencode" -> "https://$host:8000"
                else -> "https://$host"
            }
        } else {
            when (agentId) {
                "openclaw" -> "http://$host:18789/?token=$gatewayToken"
                "openhuman" -> "http://$host:7788"
                "hermes" -> "http://$host:7789"
                "opencode" -> "http://$host:8080"
                else -> "http://$host"
            }
        }
    }
}
