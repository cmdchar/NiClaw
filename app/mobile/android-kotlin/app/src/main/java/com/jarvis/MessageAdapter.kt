package com.jarvis

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

data class Message(val text: String, val isUser: Boolean)

class MessageAdapter(private val messages: MutableList<Message>) :
    RecyclerView.Adapter<MessageAdapter.MessageViewHolder>() {

    class MessageViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val messageText: TextView = view.findViewById(R.id.messageText)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val layout = if (viewType == 1) R.layout.item_message_user else R.layout.item_message_jarvis
        val view = LayoutInflater.from(parent.context).inflate(layout, parent, false)
        return MessageViewHolder(view)
    }

    private fun formatExecutionSteps(rawText: String): String {
        var formatted = rawText
        formatted = formatted.replace(Regex("<thinking>.*?</thinking>", RegexOption.DOT_MATCHES_ALL), "🧠 [Thinking Process]")
        formatted = formatted.replace(Regex("<tool_use>.*?</tool_use>", RegexOption.DOT_MATCHES_ALL), "🛠️ [Tool Executed]")
        formatted = formatted.replace(Regex("<step>.*?</step>", RegexOption.DOT_MATCHES_ALL), "✅ [Step Completed]")

        if (formatted.contains("<thinking>")) {
            formatted = formatted.replace(Regex("<thinking>.*", RegexOption.DOT_MATCHES_ALL), "🧠 [Thinking...]")
        }
        if (formatted.contains("<tool_use>")) {
            formatted = formatted.replace(Regex("<tool_use>.*", RegexOption.DOT_MATCHES_ALL), "🛠️ [Executing Tool...]")
        }

        return formatted.trim()
    }

    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        val msg = messages[position]
        holder.messageText.text = if (msg.isUser) msg.text else formatExecutionSteps(msg.text)
    }

    override fun getItemCount() = messages.size

    override fun getItemViewType(position: Int) = if (messages[position].isUser) 1 else 0
}
