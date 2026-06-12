package com.jarvis

import android.os.Bundle
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject

/**
 * ObsidianFragment — Second Brain Vault Browser
 *
 * Displays pinned notes (Today, CENTRALBRAIN, NiClaw Brain), lets the user
 * browse the vault folder tree, and read individual markdown notes with a
 * built-in reader panel. Includes full-text search across the vault.
 */
class ObsidianFragment : Fragment() {

    // ── Views ────────────────────────────────────────────────────────────────
    private lateinit var btnBack: ImageButton
    private lateinit var btnRefresh: ImageButton
    private lateinit var txtTitle: TextView
    private lateinit var txtBreadcrumb: TextView
    private lateinit var editSearch: EditText
    private lateinit var btnSearch: ImageButton
    private lateinit var loadingProgress: ProgressBar
    private lateinit var recyclerView: RecyclerView
    private lateinit var txtEmpty: TextView

    // Note reader
    private lateinit var noteReaderPanel: LinearLayout
    private lateinit var btnCloseNote: ImageButton
    private lateinit var txtNoteTitle: TextView
    private lateinit var txtNoteDate: TextView
    private lateinit var txtNoteContent: TextView

    // ── State ────────────────────────────────────────────────────────────────
    private val entries = mutableListOf<ObsidianEntry>()
    private lateinit var adapter: ObsidianAdapter
    private var currentPath: String = ""   // relative vault path; "" = root
    private var isSearchMode = false

    // ── Data class ───────────────────────────────────────────────────────────
    data class ObsidianEntry(
        val name: String,
        val path: String,
        val isDir: Boolean,
        val icon: String = "",
        val meta: String = "",
        val snippet: String = "",
        val isPinned: Boolean = false
    )

    // ── Lifecycle ────────────────────────────────────────────────────────────
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_obsidian, container, false)

        btnBack           = view.findViewById(R.id.btnBack)
        btnRefresh        = view.findViewById(R.id.btnRefresh)
        txtTitle          = view.findViewById(R.id.txtTitle)
        txtBreadcrumb     = view.findViewById(R.id.txtBreadcrumb)
        editSearch        = view.findViewById(R.id.editSearch)
        btnSearch         = view.findViewById(R.id.btnSearch)
        loadingProgress   = view.findViewById(R.id.loadingProgress)
        recyclerView      = view.findViewById(R.id.obsidianRecyclerView)
        txtEmpty          = view.findViewById(R.id.txtEmpty)
        noteReaderPanel   = view.findViewById(R.id.noteReaderPanel)
        btnCloseNote      = view.findViewById(R.id.btnCloseNote)
        txtNoteTitle      = view.findViewById(R.id.txtNoteTitle)
        txtNoteDate       = view.findViewById(R.id.txtNoteDate)
        txtNoteContent    = view.findViewById(R.id.txtNoteContent)

        adapter = ObsidianAdapter(entries) { entry ->
            if (entry.isDir) {
                currentPath = entry.path
                isSearchMode = false
                editSearch.text.clear()
                loadBrowse(entry.path)
            } else {
                loadNote(entry.path, entry.name)
            }
        }
        recyclerView.layoutManager = LinearLayoutManager(context)
        recyclerView.adapter = adapter

        btnBack.setOnClickListener {
            when {
                noteReaderPanel.visibility == View.VISIBLE -> closeNote()
                isSearchMode -> {
                    isSearchMode = false
                    editSearch.text.clear()
                    loadBrowse(currentPath)
                }
                currentPath.isNotEmpty() -> {
                    // go up one level
                    val parent = currentPath.substringBeforeLast('/', "")
                    currentPath = parent
                    loadBrowse(parent)
                }
                else -> parentFragmentManager.popBackStack()
            }
        }

        btnRefresh.setOnClickListener {
            if (isSearchMode) performSearch(editSearch.text.toString())
            else loadBrowse(currentPath)
        }

        btnCloseNote.setOnClickListener { closeNote() }

        btnSearch.setOnClickListener { performSearch(editSearch.text.toString()) }
        editSearch.setOnEditorActionListener { _, actionId, event ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH ||
                (event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN)
            ) {
                performSearch(editSearch.text.toString())
                true
            } else false
        }

        // Initial load — status + pinned notes
        loadStatus()
        return view
    }

    // ── API calls ────────────────────────────────────────────────────────────
    private fun loadStatus() {
        val ctx = context ?: return
        showLoading(true)
        ApiClient.obsidianStatus(ctx) { data, err ->
            activity?.runOnUiThread {
                showLoading(false)
                if (err != null || data == null) {
                    showEmpty("Vault inaccesibil: ${err?.message}")
                    return@runOnUiThread
                }
                entries.clear()

                // Add pinned notes first
                val pinned = data.optJSONArray("pinnedNotes")
                if (pinned != null) {
                    for (i in 0 until pinned.length()) {
                        val p = pinned.getJSONObject(i)
                        entries.add(
                            ObsidianEntry(
                                name = p.optString("label"),
                                path = p.optString("path"),
                                isDir = p.optBoolean("isDir", false),
                                icon = p.optString("icon", if (p.optBoolean("isDir", false)) "📁" else "📄"),
                                meta = "Notă fixată",
                                isPinned = true
                            )
                        )
                    }
                }

                txtBreadcrumb.text = "📂 /"
                txtEmpty.visibility = if (entries.isEmpty()) View.VISIBLE else View.GONE
                recyclerView.visibility = if (entries.isEmpty()) View.GONE else View.VISIBLE
                adapter.notifyDataSetChanged()
            }
        }
    }

    private fun loadBrowse(path: String) {
        val ctx = context ?: return
        showLoading(true)
        updateBreadcrumb(path)
        ApiClient.obsidianBrowse(ctx, path) { data, err ->
            activity?.runOnUiThread {
                showLoading(false)
                if (err != null || data == null) {
                    showEmpty("Eroare browsing: ${err?.message}")
                    return@runOnUiThread
                }
                entries.clear()
                val list = data.optJSONArray("entries") ?: JSONArray()
                for (i in 0 until list.length()) {
                    val e = list.getJSONObject(i)
                    val isDir = e.optBoolean("isDir", false)
                    val name = e.optString("name")
                    val relPath = e.optString("path")
                    val sizeKb = if (!isDir) "${(e.optLong("sizeBytes", 0) / 1024).coerceAtLeast(1)} KB" else ""
                    val mod = e.optString("modifiedAt", "")
                    val meta = if (isDir) "Folder" else "$sizeKb · ${formatDate(mod)}"
                    entries.add(
                        ObsidianEntry(
                            name = if (isDir) name else name.removeSuffix(".md").removeSuffix(".txt"),
                            path = relPath,
                            isDir = isDir,
                            icon = if (isDir) "📁" else iconForName(name),
                            meta = meta
                        )
                    )
                }
                txtEmpty.visibility = if (entries.isEmpty()) View.VISIBLE else View.GONE
                recyclerView.visibility = if (entries.isEmpty()) View.GONE else View.VISIBLE
                adapter.notifyDataSetChanged()
            }
        }
    }

    private fun performSearch(query: String) {
        if (query.trim().length < 2) {
            Toast.makeText(context, "Minim 2 caractere pentru căutare", Toast.LENGTH_SHORT).show()
            return
        }
        val ctx = context ?: return
        isSearchMode = true
        showLoading(true)
        txtBreadcrumb.text = "🔍 Rezultate: \"$query\""
        ApiClient.obsidianSearch(ctx, query) { data, err ->
            activity?.runOnUiThread {
                showLoading(false)
                if (err != null || data == null) {
                    showEmpty("Eroare căutare: ${err?.message}")
                    return@runOnUiThread
                }
                entries.clear()
                val results = data.optJSONArray("results") ?: JSONArray()
                for (i in 0 until results.length()) {
                    val r = results.getJSONObject(i)
                    entries.add(
                        ObsidianEntry(
                            name = r.optString("name"),
                            path = r.optString("path"),
                            isDir = false,
                            icon = "📄",
                            meta = r.optString("path"),
                            snippet = r.optString("snippet")
                        )
                    )
                }
                txtEmpty.visibility = if (entries.isEmpty()) View.VISIBLE else View.GONE
                recyclerView.visibility = if (entries.isEmpty()) View.GONE else View.VISIBLE
                if (entries.isEmpty()) txtEmpty.text = "Niciun rezultat pentru \"$query\""
                adapter.notifyDataSetChanged()
            }
        }
    }

    private fun loadNote(path: String, fallbackName: String) {
        val ctx = context ?: return
        showLoading(true)
        ApiClient.obsidianRead(ctx, path) { data, err ->
            activity?.runOnUiThread {
                showLoading(false)
                if (err != null || data == null) {
                    Toast.makeText(ctx, "Eroare citire notă: ${err?.message}", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }
                val name = data.optString("name", fallbackName)
                val content = data.optString("content", "")
                val modifiedAt = data.optString("modifiedAt", "")
                txtNoteTitle.text = name
                txtNoteDate.text = formatDate(modifiedAt)
                // Render markdown as plain text with basic formatting
                txtNoteContent.text = renderMarkdown(content)
                noteReaderPanel.visibility = View.VISIBLE
                recyclerView.visibility = View.GONE
                txtEmpty.visibility = View.GONE
            }
        }
    }

    private fun closeNote() {
        noteReaderPanel.visibility = View.GONE
        recyclerView.visibility = View.VISIBLE
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private fun showLoading(show: Boolean) {
        loadingProgress.visibility = if (show) View.VISIBLE else View.GONE
        if (show) {
            recyclerView.visibility = View.GONE
            txtEmpty.visibility = View.GONE
        }
    }

    private fun showEmpty(msg: String) {
        txtEmpty.text = msg
        txtEmpty.visibility = View.VISIBLE
        recyclerView.visibility = View.GONE
        loadingProgress.visibility = View.GONE
    }

    private fun updateBreadcrumb(path: String) {
        txtBreadcrumb.text = if (path.isEmpty()) "📂 /" else "📂 /$path"
    }

    private fun iconForName(name: String): String {
        val lower = name.lowercase()
        return when {
            lower.contains("today") || lower.contains("daily") || lower.contains("journal") -> "📅"
            lower.contains("brain") || lower.contains("memory") -> "🧠"
            lower.contains("project") -> "🚀"
            lower.contains("runbook") -> "📋"
            lower.contains("niclaw") || lower.contains("jarvis") -> "🤖"
            lower.contains("canvas") -> "🎨"
            lower.endsWith(".canvas") -> "🎨"
            else -> "📄"
        }
    }

    private fun formatDate(iso: String): String {
        if (iso.isEmpty()) return ""
        return try {
            // "2026-06-05T21:00:00.000Z" → "05 Jun 2026"
            val parts = iso.substringBefore('T').split('-')
            if (parts.size == 3) "${parts[2]} ${monthName(parts[1])} ${parts[0]}" else iso.substringBefore('T')
        } catch (e: Exception) { iso.substringBefore('T') }
    }

    private fun monthName(m: String): String = when(m) {
        "01" -> "Ian"; "02" -> "Feb"; "03" -> "Mar"; "04" -> "Apr"
        "05" -> "Mai"; "06" -> "Iun"; "07" -> "Iul"; "08" -> "Aug"
        "09" -> "Sep"; "10" -> "Oct"; "11" -> "Nov"; "12" -> "Dec"
        else -> m
    }

    /**
     * Very lightweight markdown → display text conversion.
     * Preserves structure while making it readable in a plain TextView.
     */
    private fun renderMarkdown(raw: String): String {
        val sb = StringBuilder()
        for (line in raw.lines()) {
            val trimmed = line.trimEnd()
            when {
                trimmed.startsWith("# ")   -> sb.appendLine("━━ ${trimmed.drop(2).uppercase()} ━━")
                trimmed.startsWith("## ")  -> sb.appendLine("▸ ${trimmed.drop(3)}")
                trimmed.startsWith("### ") -> sb.appendLine("  · ${trimmed.drop(4)}")
                trimmed.startsWith("- [ ]") -> sb.appendLine("  ☐ ${trimmed.drop(5).trim()}")
                trimmed.startsWith("- [x]") -> sb.appendLine("  ☑ ${trimmed.drop(5).trim()}")
                trimmed.startsWith("- ") || trimmed.startsWith("* ") -> sb.appendLine("  • ${trimmed.drop(2)}")
                trimmed.startsWith("```") -> sb.appendLine(if (trimmed == "```") "---" else trimmed)
                trimmed.startsWith("> ") -> sb.appendLine("  ❝ ${trimmed.drop(2)}")
                else -> sb.appendLine(trimmed)
            }
        }
        return sb.toString().trimEnd()
    }

    // ── Adapter ──────────────────────────────────────────────────────────────
    private inner class ObsidianAdapter(
        private val items: List<ObsidianEntry>,
        private val onClick: (ObsidianEntry) -> Unit
    ) : RecyclerView.Adapter<ObsidianAdapter.VH>() {

        inner class VH(view: View) : RecyclerView.ViewHolder(view) {
            val txtIcon: TextView    = view.findViewById(R.id.txtIcon)
            val txtName: TextView    = view.findViewById(R.id.txtEntryName)
            val txtMeta: TextView    = view.findViewById(R.id.txtEntryMeta)
            val txtSnippet: TextView = view.findViewById(R.id.txtSnippet)
            val txtChevron: TextView = view.findViewById(R.id.txtChevron)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val v = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_obsidian_entry, parent, false)
            return VH(v)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val e = items[position]
            holder.txtIcon.text    = e.icon.ifEmpty { if (e.isDir) "📁" else "📄" }
            holder.txtName.text    = e.name
            holder.txtMeta.text    = e.meta
            holder.txtChevron.text = "›"

            // Pinned highlight
            holder.txtName.setTextColor(
                if (e.isPinned) 0xFFA78BFA.toInt() else 0xFFCDD6F4.toInt()
            )

            if (e.snippet.isNotEmpty()) {
                holder.txtSnippet.visibility = View.VISIBLE
                holder.txtSnippet.text = e.snippet
            } else {
                holder.txtSnippet.visibility = View.GONE
            }

            holder.itemView.setOnClickListener { onClick(e) }
        }

        override fun getItemCount() = items.size
    }
}
