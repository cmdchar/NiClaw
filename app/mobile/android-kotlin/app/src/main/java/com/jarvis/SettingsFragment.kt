package com.jarvis

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.widget.SwitchCompat
import androidx.fragment.app.Fragment

class SettingsFragment : Fragment() {

    private lateinit var settingsServerUrl: EditText
    private lateinit var settingsGatewayToken: EditText
    private lateinit var btnSaveSettings: Button
    private lateinit var switchTts: SwitchCompat
    private lateinit var switchDarkMode: SwitchCompat
    private lateinit var radioLanguage: RadioGroup
    private lateinit var radioLangRo: RadioButton
    private lateinit var radioLangEn: RadioButton
    private lateinit var valGatewayStatus: TextView
    private lateinit var btnRestartGateway: Button

    // New Proxy Settings Views
    private lateinit var switchProxyEnabled: SwitchCompat
    private lateinit var editProxyServer: EditText
    private lateinit var editProxyBypass: EditText
    private lateinit var btnSaveProxy: Button

    // New Advanced Settings Views
    private lateinit var switchDevMode: SwitchCompat
    private lateinit var switchAutoStart: SwitchCompat
    private lateinit var txtLogTerminal: TextView
    private lateinit var btnFetchLogs: Button
    private lateinit var btnRunDoctor: Button
    private lateinit var btnConfigureChannels: Button
    private lateinit var btnConfigureCron: Button
    private lateinit var btnConfigureSkills: Button
    private lateinit var btnConfigureModels: Button
    private lateinit var btnConfigureDreams: Button
    private lateinit var btnConfigureObsidian: Button
    private lateinit var btnAgentMesh: Button

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_settings, container, false)

        // Bind existing views
        settingsServerUrl = view.findViewById(R.id.settingsServerUrl)
        settingsGatewayToken = view.findViewById(R.id.settingsGatewayToken)
        btnSaveSettings = view.findViewById(R.id.btnSaveSettings)
        switchTts = view.findViewById(R.id.switchTts)
        switchDarkMode = view.findViewById(R.id.switchDarkMode)
        radioLanguage = view.findViewById(R.id.radioLanguage)
        radioLangRo = view.findViewById(R.id.radioLangRo)
        radioLangEn = view.findViewById(R.id.radioLangEn)
        valGatewayStatus = view.findViewById(R.id.valGatewayStatus)
        btnRestartGateway = view.findViewById(R.id.btnRestartGateway)

        // Bind new Proxy views
        switchProxyEnabled = view.findViewById(R.id.switchProxyEnabled)
        editProxyServer = view.findViewById(R.id.editProxyServer)
        editProxyBypass = view.findViewById(R.id.editProxyBypass)
        btnSaveProxy = view.findViewById(R.id.btnSaveProxy)

        // Bind new Advanced & Diagnostic views
        switchDevMode = view.findViewById(R.id.switchDevMode)
        switchAutoStart = view.findViewById(R.id.switchAutoStart)
        txtLogTerminal = view.findViewById(R.id.txtLogTerminal)
        btnFetchLogs = view.findViewById(R.id.btnFetchLogs)
        btnRunDoctor = view.findViewById(R.id.btnRunDoctor)
        btnConfigureChannels = view.findViewById(R.id.btnConfigureChannels)
        btnConfigureCron = view.findViewById(R.id.btnConfigureCron)
        btnConfigureSkills = view.findViewById(R.id.btnConfigureSkills)
        btnConfigureModels = view.findViewById(R.id.btnConfigureModels)
        btnConfigureDreams = view.findViewById(R.id.btnConfigureDreams)
        btnConfigureObsidian = view.findViewById(R.id.btnConfigureObsidian)
        btnAgentMesh = view.findViewById(R.id.btnAgentMesh)

        val mainActivity = activity as? MainActivity

        loadSettings()

        // Sync connection status display
        val currentStatus = mainActivity?.getCurrentStatus() ?: "Deconectat"
        updateStatusDisplay(currentStatus)

        // Click listeners
        btnSaveSettings.setOnClickListener {
            saveSettings()
        }

        btnRestartGateway.setOnClickListener {
            val ctx = context ?: return@setOnClickListener
            btnRestartGateway.isEnabled = false
            btnRestartGateway.text = "Se repornește..."
            
            ApiClient.restartGateway(ctx) { success, error ->
                activity?.runOnUiThread {
                    btnRestartGateway.isEnabled = true
                    btnRestartGateway.text = "Repornește Servicii Gateway"
                    if (success) {
                        Toast.makeText(ctx, "Comandă de restart trimisă!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(ctx, "Eroare: ${error?.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        btnSaveProxy.setOnClickListener {
            saveProxySettings()
        }

        btnFetchLogs.setOnClickListener {
            fetchServerLogs()
        }

        btnRunDoctor.setOnClickListener {
            runServerDiagnostics()
        }

        btnConfigureChannels.setOnClickListener {
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, ChannelsFragment())
                .addToBackStack(null)
                .commit()
        }

        btnConfigureCron.setOnClickListener {
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, CronFragment())
                .addToBackStack(null)
                .commit()
        }

        btnConfigureSkills.setOnClickListener {
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, SkillsFragment())
                .addToBackStack(null)
                .commit()
        }

        btnConfigureModels.setOnClickListener {
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, ModelsFragment())
                .addToBackStack(null)
                .commit()
        }

        btnConfigureDreams.setOnClickListener {
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, DreamsFragment())
                .addToBackStack(null)
                .commit()
        }

        btnConfigureObsidian.setOnClickListener {
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, ObsidianFragment())
                .addToBackStack(null)
                .commit()
        }

        btnAgentMesh.setOnClickListener {
            parentFragmentManager.beginTransaction()
                .replace(R.id.fragmentContainer, AgentMeshFragment())
                .addToBackStack(null)
                .commit()
        }

        // Toggles
        switchTts.setOnCheckedChangeListener { _, isChecked ->
            val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return@setOnCheckedChangeListener
            prefs.edit().putBoolean("tts_enabled", isChecked).apply()
            mainActivity?.setTtsEnabled(isChecked)
        }

        switchDarkMode.setOnCheckedChangeListener { _, isChecked ->
            val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return@setOnCheckedChangeListener
            prefs.edit().putBoolean("dark_mode", isChecked).apply()
            Toast.makeText(context, "Temă salvată!", Toast.LENGTH_SHORT).show()
        }

        switchProxyEnabled.setOnCheckedChangeListener { _, isChecked ->
            val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return@setOnCheckedChangeListener
            prefs.edit().putBoolean("proxy_enabled", isChecked).apply()
        }

        switchDevMode.setOnCheckedChangeListener { _, isChecked ->
            val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return@setOnCheckedChangeListener
            prefs.edit().putBoolean("dev_mode_enabled", isChecked).apply()
            Toast.makeText(context, "Mod Dezvoltator " + (if (isChecked) "activat" else "dezactivat"), Toast.LENGTH_SHORT).show()
        }

        switchAutoStart.setOnCheckedChangeListener { _, isChecked ->
            val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return@setOnCheckedChangeListener
            prefs.edit().putBoolean("auto_start_enabled", isChecked).apply()
        }

        radioLanguage.setOnCheckedChangeListener { _, checkedId ->
            val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return@setOnCheckedChangeListener
            val lang = if (checkedId == R.id.radioLangRo) "ro-RO" else "en-US"
            prefs.edit().putString("language", lang).apply()
            mainActivity?.updateLanguage(lang)
        }

        return view
    }

    private fun loadSettings() {
        val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return
        
        // Base API Connection
        settingsServerUrl.setText(prefs.getString("server_url", "ws://10.10.1.219:3000/jarvis/stream"))
        settingsGatewayToken.setText(prefs.getString("gateway_token", "35c6ae8e7a685718dfb4a45a1f2982d5"))
        
        // Preferences
        switchTts.isChecked = prefs.getBoolean("tts_enabled", true)
        switchDarkMode.isChecked = prefs.getBoolean("dark_mode", true)
        
        val lang = prefs.getString("language", "ro-RO")!!
        if (lang == "ro-RO") {
            radioLangRo.isChecked = true
        } else {
            radioLangEn.isChecked = true
        }

        // Load Proxy Settings
        switchProxyEnabled.isChecked = prefs.getBoolean("proxy_enabled", false)
        editProxyServer.setText(prefs.getString("proxy_server", "http://127.0.0.1:7890"))
        editProxyBypass.setText(prefs.getString("proxy_bypass", "localhost;127.0.0.1;::1"))

        // Load Advanced Settings
        switchDevMode.isChecked = prefs.getBoolean("dev_mode_enabled", false)
        switchAutoStart.isChecked = prefs.getBoolean("auto_start_enabled", false)
    }

    private fun saveSettings() {
        val mainActivity = activity as? MainActivity
        val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return
        
        val newUrl = settingsServerUrl.text.toString().trim()
        val newToken = settingsGatewayToken.text.toString().trim()

        if (newUrl.isEmpty()) {
            Toast.makeText(context, "URL-ul nu poate fi gol!", Toast.LENGTH_SHORT).show()
            return
        }

        prefs.edit().apply {
            putString("server_url", newUrl)
            putString("gateway_token", newToken)
            apply()
        }

        mainActivity?.reconnect(newUrl)
        Toast.makeText(context, "Setări salvate! Se reconectează...", Toast.LENGTH_SHORT).show()
    }

    private fun saveProxySettings() {
        val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return
        val server = editProxyServer.text.toString().trim()
        val bypass = editProxyBypass.text.toString().trim()

        prefs.edit().apply {
            putString("proxy_server", server)
            putString("proxy_bypass", bypass)
            apply()
        }
        Toast.makeText(context, "Setări Proxy salvate pe mobil!", Toast.LENGTH_SHORT).show()
    }

    private fun fetchServerLogs() {
        val ctx = context ?: return
        txtLogTerminal.text = "Se descarcă logurile de pe server..."
        
        ApiClient.fetchLogs(ctx) { logs, error ->
            activity?.runOnUiThread {
                if (error != null) {
                    txtLogTerminal.text = "Eroare la descărcarea logurilor:\n${error.localizedMessage}"
                } else {
                    txtLogTerminal.text = logs ?: "Niciun log disponibil pe server."
                }
            }
        }
    }

    private fun runServerDiagnostics() {
        val ctx = context ?: return
        txtLogTerminal.text = "Se rulează diagnosticarea OpenClaw Doctor pe server..."
        
        ApiClient.runDoctor(ctx, "diagnose") { result, error ->
            activity?.runOnUiThread {
                if (error != null) {
                    txtLogTerminal.text = "Eroare la rularea diagnosticării:\n${error.localizedMessage}"
                } else {
                    txtLogTerminal.text = result ?: "Diagnosticare finalizată."
                }
            }
        }
    }

    fun updateStatusDisplay(status: String) {
        if (!isAdded) return
        activity?.runOnUiThread {
            valGatewayStatus.text = status.toUpperCase()
            if (status == "Conectat") {
                valGatewayStatus.setTextColor(0xFF00E5FF.toInt())
            } else {
                valGatewayStatus.setTextColor(0xFFFF5252.toInt())
            }
        }
    }
}
