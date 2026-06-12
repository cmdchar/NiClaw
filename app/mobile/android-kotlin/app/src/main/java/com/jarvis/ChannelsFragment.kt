package com.jarvis

import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.widget.SwitchCompat
import androidx.fragment.app.Fragment
import org.json.JSONArray

class ChannelsFragment : Fragment() {

    private lateinit var switchTelegram: SwitchCompat
    private lateinit var editTelegramToken: EditText
    private lateinit var editTelegramChatId: EditText
    private lateinit var btnSaveTelegram: Button

    private lateinit var switchDiscord: SwitchCompat
    private lateinit var editDiscordWebhook: EditText
    private lateinit var btnSaveDiscord: Button

    private lateinit var switchWhatsapp: SwitchCompat

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_channels, container, false)

        switchTelegram = view.findViewById(R.id.switchTelegram)
        editTelegramToken = view.findViewById(R.id.editTelegramToken)
        editTelegramChatId = view.findViewById(R.id.editTelegramChatId)
        btnSaveTelegram = view.findViewById(R.id.btnSaveTelegram)

        switchDiscord = view.findViewById(R.id.switchDiscord)
        editDiscordWebhook = view.findViewById(R.id.editDiscordWebhook)
        btnSaveDiscord = view.findViewById(R.id.btnSaveDiscord)

        switchWhatsapp = view.findViewById(R.id.switchWhatsapp)

        loadLocalChannelSettings()
        fetchServerChannelStatus()

        btnSaveTelegram.setOnClickListener {
            saveTelegramSettings()
        }

        btnSaveDiscord.setOnClickListener {
            saveDiscordSettings()
        }

        // Hook up server toggles
        switchTelegram.setOnCheckedChangeListener { _, isChecked ->
            toggleServerChannel("telegram", isChecked)
        }

        switchDiscord.setOnCheckedChangeListener { _, isChecked ->
            toggleServerChannel("discord", isChecked)
        }

        switchWhatsapp.setOnCheckedChangeListener { _, isChecked ->
            toggleServerChannel("whatsapp", isChecked)
        }

        return view
    }

    private fun loadLocalChannelSettings() {
        val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return
        
        editTelegramToken.setText(prefs.getString("telegram_token", ""))
        editTelegramChatId.setText(prefs.getString("telegram_chat_id", ""))
        editDiscordWebhook.setText(prefs.getString("discord_webhook", ""))
    }

    private fun fetchServerChannelStatus() {
        val ctx = context ?: return
        ApiClient.getChannels(ctx) { channelsArray, error ->
            activity?.runOnUiThread {
                if (error != null) {
                    Toast.makeText(ctx, "Eroare citire canale server: ${error.message}", Toast.LENGTH_SHORT).show()
                } else if (channelsArray != null) {
                    updateSwitchesFromServer(channelsArray)
                }
            }
        }
    }

    private fun updateSwitchesFromServer(channels: JSONArray) {
        for (i in 0 until channels.length()) {
            val chan = channels.optJSONObject(i) ?: continue
            val type = chan.optString("channelType", "").toLowerCase()
            val status = chan.optString("status", "").toLowerCase()
            val isEnabled = status == "connected" || status == "degraded" || status == "starting" || status == "running"

            // Temp block listener to prevent loop triggers
            when (type) {
                "telegram" -> {
                    switchTelegram.setOnCheckedChangeListener(null)
                    switchTelegram.isChecked = isEnabled
                    switchTelegram.setOnCheckedChangeListener { _, isChecked -> toggleServerChannel("telegram", isChecked) }
                }
                "discord" -> {
                    switchDiscord.setOnCheckedChangeListener(null)
                    switchDiscord.isChecked = isEnabled
                    switchDiscord.setOnCheckedChangeListener { _, isChecked -> toggleServerChannel("discord", isChecked) }
                }
                "whatsapp" -> {
                    switchWhatsapp.setOnCheckedChangeListener(null)
                    switchWhatsapp.isChecked = isEnabled
                    switchWhatsapp.setOnCheckedChangeListener { _, isChecked -> toggleServerChannel("whatsapp", isChecked) }
                }
            }
        }
    }

    private fun toggleServerChannel(channelType: String, isEnabled: Boolean) {
        val ctx = context ?: return
        ApiClient.toggleChannel(ctx, channelType, isEnabled) { success, error ->
            activity?.runOnUiThread {
                if (success) {
                    Toast.makeText(ctx, "Canalul $channelType a fost " + (if (isEnabled) "activat" else "dezactivat") + " pe server!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(ctx, "Eroare comutare canal server: ${error?.message}", Toast.LENGTH_LONG).show()
                    
                    // Revert switch visually
                    fetchServerChannelStatus()
                }
            }
        }
    }

    private fun saveTelegramSettings() {
        val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return
        val token = editTelegramToken.text.toString().trim()
        val chatId = editTelegramChatId.text.toString().trim()

        prefs.edit().apply {
            putString("telegram_token", token)
            putString("telegram_chat_id", chatId)
            apply()
        }
        Toast.makeText(context, "Setări Telegram salvate local!", Toast.LENGTH_SHORT).show()
    }

    private fun saveDiscordSettings() {
        val prefs = activity?.getSharedPreferences("JarvisPrefs", Context.MODE_PRIVATE) ?: return
        val webhook = editDiscordWebhook.text.toString().trim()

        prefs.edit().putString("discord_webhook", webhook).apply()
        Toast.makeText(context, "Setări Discord salvate local!", Toast.LENGTH_SHORT).show()
    }
}
