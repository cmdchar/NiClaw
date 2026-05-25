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

    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        holder.messageText.text = messages[position].text
    }

    override fun getItemCount() = messages.size

    override fun getItemViewType(position: Int) = if (messages[position].isUser) 1 else 0

    fun addMessage(message: Message) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }

    fun updateLastMessage(chunk: String) {
        if (messages.isNotEmpty() && !messages.last().isUser) {
            val lastMsg = messages.last()
            messages[messages.size - 1] = Message(lastMsg.text + chunk, false)
            notifyItemChanged(messages.size - 1)
        }
    }
}
