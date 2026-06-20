package com.jarvis

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.camera2.CameraManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.google.android.material.bottomnavigation.BottomNavigationView
import org.json.JSONObject
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var tts: TextToSpeech
    private lateinit var speechRecognizer: SpeechRecognizer
    private lateinit var jarvisClient: JarvisClient

    // Fragment Instances
    private val chatFragment = ChatFragment()
    private val agentsFragment = AgentsFragment()
    private val unifiedCommandCenterFragment = UnifiedCommandCenterFragment()
    private val portalFragment = PortalFragment()
    private val settingsFragment = SettingsFragment()


    // Global App States and Caches
    private var activeAdapter: MessageAdapter? = null
    private val messageCache = mutableListOf<Message>()
    private var currentStatus = "Deconectat"
    private var ttsEnabled = true
    private var assistantLanguage = "ro-RO"

    private val RECORD_AUDIO_REQUEST_CODE = 101
    private var isFlashlightOn = false
    private var isClassicWsEnabled = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val prefs = getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE)
        var serverUrl = prefs.getString("server_url", "ws://100.82.149.22:3000/jarvis/stream")!!
        if (serverUrl.contains(":13210/jarvis/stream")) {
            serverUrl = serverUrl.replace(":13210/jarvis/stream", ":3000/jarvis/stream")
            prefs.edit().putString("server_url", serverUrl).apply()
        }
        ttsEnabled = prefs.getBoolean("tts_enabled", true)
        assistantLanguage = prefs.getString("language", "ro-RO")!!

        jarvisClient = JarvisClient(serverUrl, this)

        setupSTT()
        setupTTS()
        fetchCapabilities()

        // Setup Bottom Navigation
        val bottomNav: BottomNavigationView = findViewById(R.id.bottomNav)
        bottomNav.setOnItemSelectedListener { item ->
            val fragment: Fragment = when (item.itemId) {
                R.id.navigation_chat -> chatFragment
                R.id.navigation_agents -> agentsFragment
                R.id.navigation_spatial -> unifiedCommandCenterFragment
                R.id.navigation_portal -> portalFragment
                R.id.navigation_settings -> settingsFragment

                else -> chatFragment
            }
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, fragment)
                .commit()
            true
        }

        // Set initial fragment
        if (savedInstanceState == null) {
            val startTab = intent.getStringExtra("tab")
            val initialFragment = when (startTab) {
                "agents" -> {
                    bottomNav.selectedItemId = R.id.navigation_agents
                    agentsFragment
                }
                "spatial" -> {
                    bottomNav.selectedItemId = R.id.navigation_spatial
                    unifiedCommandCenterFragment
                }
                "portal" -> {
                    bottomNav.selectedItemId = R.id.navigation_portal
                    portalFragment
                }
                "settings" -> {
                    bottomNav.selectedItemId = R.id.navigation_settings
                    settingsFragment
                }
                "governance" -> {
                    bottomNav.selectedItemId = R.id.navigation_settings
                    settingsFragment
                }
                else -> chatFragment
            }
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, initialFragment)
                .commit()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val tab = intent.getStringExtra("tab")
        if (tab != null) {
            val bottomNav: BottomNavigationView = findViewById(R.id.bottomNav)
            val fragment: Fragment = when (tab) {
                "agents" -> {
                    bottomNav.selectedItemId = R.id.navigation_agents
                    agentsFragment
                }
                "spatial" -> {
                    bottomNav.selectedItemId = R.id.navigation_spatial
                    unifiedCommandCenterFragment
                }
                "portal" -> {
                    bottomNav.selectedItemId = R.id.navigation_portal
                    portalFragment
                }
                "settings" -> {
                    bottomNav.selectedItemId = R.id.navigation_settings
                    settingsFragment
                }
                "governance" -> {
                    bottomNav.selectedItemId = R.id.navigation_settings
                    settingsFragment
                }
                else -> {
                    bottomNav.selectedItemId = R.id.navigation_chat
                    chatFragment
                }
            }
            supportFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, fragment)
                .commit()
        }
    }

    // Helper cache and delegation functions for fragments
    fun getCachedMessages(): MutableList<Message> = messageCache

    fun setActiveMessageAdapter(adapter: MessageAdapter?) {
        this.activeAdapter = adapter
    }

    fun getCurrentStatus(): String = currentStatus

    fun setTtsEnabled(enabled: Boolean) {
        this.ttsEnabled = enabled
    }

    fun updateLanguage(lang: String) {
        this.assistantLanguage = lang
        try {
            if (lang == "ro-RO") {
                tts.language = Locale("ro", "RO")
            } else {
                tts.language = Locale("en", "US")
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun reconnect(newUrl: String) {
        if (!isClassicWsEnabled) {
            onStatusUpdate("Conectat (REST)")
            return
        }
        jarvisClient.reconnect(newUrl)
        onStatusUpdate("Reconectare...")
    }

    fun sendMessage(text: String) {
        val userMsg = Message(text, true)
        messageCache.add(userMsg)
        activeAdapter?.notifyItemInserted(messageCache.size - 1)
        jarvisClient.sendMessage(text)
    }

    fun checkPermissionAndListen() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), RECORD_AUDIO_REQUEST_CODE)
        } else {
            startListening()
        }
    }

    private fun setupSTT() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(p: Bundle?) { onStatusUpdate("Jarvis ascultă...") }
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                if (!matches.isNullOrEmpty()) sendMessage(matches[0])
            }
            override fun onError(e: Int) { onStatusUpdate("Eroare voce") }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(r: Float) {}
            override fun onBufferReceived(b: ByteArray?) {}
            override fun onEndOfSpeech() { onStatusUpdate("Procesez...") }
            override fun onPartialResults(p: Bundle?) {}
            override fun onEvent(ev: Int, p: Bundle?) {}
        })
    }

    private fun setupTTS() {
        tts = TextToSpeech(this) { s -> 
            if (s != TextToSpeech.ERROR) {
                updateLanguage(assistantLanguage)
            }
        }
    }

    private fun startListening() {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, assistantLanguage)
        }
        speechRecognizer.startListening(i)
    }

    fun onStreamingStart() {
        runOnUiThread {
            val botMsg = Message("", false)
            messageCache.add(botMsg)
            activeAdapter?.notifyItemInserted(messageCache.size - 1)
        }
    }

    fun onStreamingChunk(chunk: String) {
        runOnUiThread {
            if (messageCache.isNotEmpty() && !messageCache.last().isUser) {
                val lastMsg = messageCache.last()
                val updatedMsg = Message(lastMsg.text + chunk, false)
                messageCache[messageCache.size - 1] = updatedMsg
                activeAdapter?.notifyItemChanged(messageCache.size - 1)
            }
        }
    }

    fun onJarvisResponse(response: JSONObject) {
        runOnUiThread {
            val type = response.optString("type")
            val text = response.optString("text")

            // Prevent streaming duplication
            if (type == "full") {
                if (messageCache.isNotEmpty() && !messageCache.last().isUser) {
                    // Update final content if streaming message is present
                    messageCache[messageCache.size - 1] = Message(text, false)
                    activeAdapter?.notifyItemChanged(messageCache.size - 1)
                } else if (text.isNotEmpty()) {
                    val finalMsg = Message(text, false)
                    messageCache.add(finalMsg)
                    activeAdapter?.notifyItemInserted(messageCache.size - 1)
                }
            }

            if (text.isNotEmpty() && ttsEnabled) {
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "")
            }

            val actions = response.optJSONArray("actions")
            for (i in 0 until (actions?.length() ?: 0)) {
                handleAction(actions!!.getJSONObject(i))
            }
            onStatusUpdate("Conectat")
        }
    }

    private fun fetchCapabilities() {
        ApiClient.getCapabilities(this) { caps, error ->
            if (caps != null) {
                isClassicWsEnabled = caps.optBoolean("classicJarvisWs", true)
                if (!isClassicWsEnabled) {
                    onStatusUpdate("Conectat (REST)")
                }
            }
        }
    }

    fun onStatusUpdate(msg: String) {
        if (msg == "Eroare Conexiune" && !isClassicWsEnabled) {
            return // Suppress
        }
        runOnUiThread {
            currentStatus = msg
            // Inform active fragment views
            if (chatFragment.isAdded) {
                chatFragment.updateStatus(msg)
            }
            if (settingsFragment.isAdded) {
                settingsFragment.updateStatusDisplay(msg)
            }
        }
    }

    private fun handleAction(action: JSONObject) {
        try {
            when (action.getString("type")) {
                "open_url" -> startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(action.getString("url"))))
                "open_app" -> {
                    val intent = packageManager.getLaunchIntentForPackage(action.getString("package"))
                    if (intent != null) startActivity(intent)
                }
                "open_settings" -> startActivity(Intent(Settings.ACTION_SETTINGS))
                "toggle_flashlight" -> toggleFlashlight()
                "make_call" -> {
                    val recipient = action.optString("recipient")
                    Toast.makeText(this, "Apelează către: $recipient", Toast.LENGTH_LONG).show()
                }
            }
        } catch (e: Exception) { e.printStackTrace() }
    }

    private fun toggleFlashlight() {
        try {
            val cameraManager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
            val cameraId = cameraManager.cameraIdList[0]
            isFlashlightOn = !isFlashlightOn
            cameraManager.setTorchMode(cameraId, isFlashlightOn)
        } catch (e: Exception) {
            Toast.makeText(this, "Eroare lanternă", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == RECORD_AUDIO_REQUEST_CODE && grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            startListening()
        }
    }
}
