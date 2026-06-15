package com.jarvis

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.widget.SwitchCompat
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject

class ModelsFragment : Fragment() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var btnBack: ImageButton
    private lateinit var btnRefresh: ImageButton
    private lateinit var progressLoading: ProgressBar
    private lateinit var txtEmpty: TextView
    private lateinit var txtUsageContent: TextView
    private val accounts = mutableListOf<JSONObject>()
    private val vendorsMap = mutableMapOf<String, JSONObject>()
    private var defaultAccountId: String? = null
    private lateinit var adapter: ModelsAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_models, container, false)

        recyclerView = view.findViewById(R.id.modelsRecyclerView)
        btnBack = view.findViewById(R.id.btnBack)
        btnRefresh = view.findViewById(R.id.btnRefresh)
        progressLoading = view.findViewById(R.id.loadingProgress)
        txtEmpty = view.findViewById(R.id.txtEmpty)
        txtUsageContent = view.findViewById(R.id.txtUsageContent)

        // Setup Back button
        btnBack.setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        // Setup Refresh button
        btnRefresh.setOnClickListener {
            loadModelsSnapshot()
        }

        // Setup RecyclerView
        adapter = ModelsAdapter(accounts)
        recyclerView.layoutManager = LinearLayoutManager(context)
        recyclerView.adapter = adapter

        loadUsageHistory()
        loadModelsSnapshot()

        return view
    }

    private fun loadModelsSnapshot() {
        val ctx = context ?: return
        progressLoading.visibility = View.VISIBLE
        txtEmpty.visibility = View.GONE
        
        loadUsageHistory()

        // Parallel load or nested load
        ApiClient.getProviderVendors(ctx) { vendorsArray, errorVendors ->
            if (errorVendors != null) {
                activity?.runOnUiThread {
                    progressLoading.visibility = View.GONE
                    Toast.makeText(ctx, "Eroare vendors: ${errorVendors.message}", Toast.LENGTH_LONG).show()
                }
                return@getProviderVendors
            }

            vendorsMap.clear()
            if (vendorsArray != null) {
                for (i in 0 until vendorsArray.length()) {
                    val vendor = vendorsArray.getJSONObject(i)
                    val id = vendor.optString("id", "")
                    if (id.isNotEmpty()) {
                        vendorsMap[id] = vendor
                    }
                }
            }

            ApiClient.getDefaultProviderAccount(ctx) { defaultId, _ ->
                defaultAccountId = defaultId

                ApiClient.getProviderAccounts(ctx) { accountsArray, errorAccounts ->
                    activity?.runOnUiThread {
                        progressLoading.visibility = View.GONE
                        if (errorAccounts != null) {
                            Toast.makeText(ctx, "Eroare accounts: ${errorAccounts.message}", Toast.LENGTH_LONG).show()
                            Log.e("ModelsFragment", "Failed to fetch accounts", errorAccounts)
                        } else {
                            accounts.clear()
                            if (accountsArray != null) {
                                for (i in 0 until accountsArray.length()) {
                                    accounts.add(accountsArray.getJSONObject(i))
                                }
                            }
                            // Sort default first, then by updated status
                            accounts.sortWith(Comparator { a, b ->
                                val idA = a.optString("id", "")
                                val idB = b.optString("id", "")
                                if (idA == defaultAccountId) return@Comparator -1
                                if (idB == defaultAccountId) return@Comparator 1
                                return@Comparator idB.compareTo(idA)
                            })
                            adapter.notifyDataSetChanged()

                            if (accounts.isEmpty()) {
                                txtEmpty.visibility = View.VISIBLE
                            }
                        }
                    }
                }
            }
        }
    }

    private fun loadUsageHistory() {
        val ctx = context ?: return
        txtUsageContent.text = "Se încarcă istoricul..."
        ApiClient.getUsageHistory(ctx, 30) { historyObj, error ->
            activity?.runOnUiThread {
                progressLoading.visibility = View.GONE
                if (error != null) {
                    android.util.Log.e("ModelsFragment", "getUsageHistory error", error)
                    txtUsageContent.text = "Istoricul nu a putut fi Ã®ncÄƒrcat.\nAcest backend ar putea necesita un update (rute lipsÄƒ)."
                    return@runOnUiThread
                }
                if (historyObj == null) {
                    txtUsageContent.text = "Nu există date de utilizare."
                    return@runOnUiThread
                }
                
                val historyArray = historyObj.optJSONArray("history")
                if (historyArray == null || historyArray.length() == 0) {
                    txtUsageContent.text = "Nicio utilizare înregistrată recent."
                    return@runOnUiThread
                }
                
                val sb = StringBuilder()
                for (i in 0 until Math.min(historyArray.length(), 5)) {
                    val entry = historyArray.optJSONObject(i) ?: continue
                    val modelId = entry.optString("modelId")
                    val tokensIn = entry.optInt("inputTokens", 0)
                    val tokensOut = entry.optInt("outputTokens", 0)
                    val cost = entry.optDouble("estimatedCost", 0.0)
                    
                    sb.append("• ").append(modelId).append("\n")
                    sb.append("  In: ").append(tokensIn.toString()).append(" | Out: ").append(tokensOut.toString())
                    sb.append(String.format(" | $%.4f\n\n", cost))
                }
                txtUsageContent.text = sb.toString().trim()
            }
        }
    }

    // Inner Adapter Class
    private inner class ModelsAdapter(private val items: List<JSONObject>) :
        RecyclerView.Adapter<ModelsAdapter.ViewHolder>() {

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val txtVendorIcon: TextView = view.findViewById(R.id.txtVendorIcon)
            val txtAccountLabel: TextView = view.findViewById(R.id.txtAccountLabel)
            val badgeDefault: TextView = view.findViewById(R.id.badgeDefault)
            val txtModelName: TextView = view.findViewById(R.id.txtModelName)
            val switchEnabled: SwitchCompat = view.findViewById(R.id.switchEnabled)
            val btnSetDefault: Button = view.findViewById(R.id.btnSetDefault)
            val divider: View = view.findViewById(R.id.divider)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_model, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val account = items[position]

            val accountId = account.optString("id", "")
            val vendorId = account.optString("vendorId", "")
            val label = account.optString("label", "Furnizor Fără Nume")
            val model = account.optString("model", "(none)")
            val enabled = account.optBoolean("enabled", false)

            holder.txtAccountLabel.text = label
            holder.txtModelName.text = "Model: $model"

            // Display vendor icon/details if available
            val vendor = vendorsMap[vendorId]
            if (vendor != null) {
                holder.txtVendorIcon.text = when (vendorId.lowercase()) {
                    "openai" -> "🟢"
                    "gemini" -> "🔵"
                    "deepseek" -> "🟡"
                    "anthropic" -> "🟠"
                    "ollama" -> "🦙"
                    else -> "🤖"
                }
            } else {
                holder.txtVendorIcon.text = "🤖"
            }

            // Default indicator
            val isDefault = accountId == defaultAccountId
            if (isDefault) {
                holder.badgeDefault.visibility = View.VISIBLE
                holder.btnSetDefault.visibility = View.GONE
                holder.divider.visibility = View.GONE
            } else {
                holder.badgeDefault.visibility = View.GONE
                holder.btnSetDefault.visibility = View.VISIBLE
                holder.divider.visibility = View.VISIBLE
            }

            // Bind toggle change
            holder.switchEnabled.setOnCheckedChangeListener(null)
            holder.switchEnabled.isChecked = enabled
            holder.switchEnabled.setOnCheckedChangeListener { _, isChecked ->
                val ctx = holder.itemView.context
                ApiClient.toggleProviderAccount(ctx, accountId, isChecked) { success, err ->
                    activity?.runOnUiThread {
                        if (!success) {
                            Toast.makeText(ctx, "Eroare toggle: ${err?.message}", Toast.LENGTH_SHORT).show()
                            holder.switchEnabled.setOnCheckedChangeListener(null)
                            holder.switchEnabled.isChecked = !isChecked
                            holder.switchEnabled.setOnCheckedChangeListener { _, _ -> }
                        } else {
                            Toast.makeText(ctx, "Furnizor " + (if (isChecked) "activat" else "dezactivat"), Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }

            // Bind set default button
            holder.btnSetDefault.setOnClickListener {
                val ctx = holder.itemView.context
                holder.btnSetDefault.isEnabled = false
                holder.btnSetDefault.text = "Setare..."

                ApiClient.setDefaultProviderAccount(ctx, accountId) { success, err ->
                    activity?.runOnUiThread {
                        holder.btnSetDefault.isEnabled = true
                        holder.btnSetDefault.text = "Setează implicit"
                        if (success) {
                            Toast.makeText(ctx, "Furnizor setat ca implicit!", Toast.LENGTH_SHORT).show()
                            loadModelsSnapshot() // reload to show default badge
                        } else {
                            Toast.makeText(ctx, "Eroare default: ${err?.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            }
        }

        override fun getItemCount(): Int = items.size
    }
}
