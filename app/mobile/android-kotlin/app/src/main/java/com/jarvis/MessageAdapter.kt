package com.jarvis

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

import android.widget.Button
import android.widget.LinearLayout
import android.widget.HorizontalScrollView
import org.json.JSONObject

data class ClarificationOption(val id: String, val label: String)

data class Message(
    val text: String, 
    val isUser: Boolean,
    val options: List<ClarificationOption>? = null
)

class MessageAdapter(
    private val messages: MutableList<Message>,
    private val onOptionSelected: ((ClarificationOption) -> Unit)? = null
) : RecyclerView.Adapter<MessageAdapter.MessageViewHolder>() {

    class MessageViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val messageText: TextView = view.findViewById(R.id.messageText)
        val chipsScrollView: HorizontalScrollView? = view.findViewById(R.id.chipsScrollView)
        val chipsContainer: LinearLayout? = view.findViewById(R.id.chipsContainer)
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
        
        if (!msg.isUser && holder.chipsScrollView != null && holder.chipsContainer != null) {
            if (!msg.options.isNullOrEmpty()) {
                holder.chipsScrollView.visibility = View.VISIBLE
                holder.chipsContainer.removeAllViews()
                for (option in msg.options) {
                    val button = Button(holder.itemView.context).apply {
                        text = option.label
                        setTextColor(android.graphics.Color.parseColor("#00E5FF"))
                        setBackgroundColor(android.graphics.Color.parseColor("#3300E5FF"))
                        setPadding(16, 8, 16, 8)
                        val layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        )
                        layoutParams.setMargins(0, 0, 16, 0)
                        this.layoutParams = layoutParams
                        
                        setOnClickListener {
                            onOptionSelected?.invoke(option)
                        }
                    }
                    holder.chipsContainer.addView(button)
                }
            } else {
                holder.chipsScrollView.visibility = View.GONE
            }
        }
    }

    override fun getItemCount() = messages.size

    override fun getItemViewType(position: Int) = if (messages[position].isUser) 1 else 0
}
