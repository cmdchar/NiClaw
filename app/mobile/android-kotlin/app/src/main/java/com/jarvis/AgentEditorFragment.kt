package com.jarvis

import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import org.json.JSONArray
import org.json.JSONObject

class AgentEditorFragment : Fragment() {

    private var initialAgentData: String? = null

    companion object {
        fun newInstance(agentJson: String?): AgentEditorFragment {
            val frag = AgentEditorFragment()
            val args = Bundle()
            args.putString("agent_json", agentJson)
            frag.arguments = args
            return frag
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        initialAgentData = arguments?.getString("agent_json")
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_agent_editor, container, false)

        val txtEditorTitle = view.findViewById<TextView>(R.id.txtEditorTitle)
        val btnBack = view.findViewById<ImageButton>(R.id.btnBack)
        val btnSaveAgent = view.findViewById<Button>(R.id.btnSaveAgent)

        val editAgentName = view.findViewById<EditText>(R.id.editAgentName)
        val editAgentSlug = view.findViewById<EditText>(R.id.editAgentSlug)
        val editAgentRole = view.findViewById<EditText>(R.id.editAgentRole)
        
        val spinnerProvider = view.findViewById<Spinner>(R.id.spinnerProvider)
        val editEndpoint = view.findViewById<EditText>(R.id.editEndpoint)
        val spinnerModel = view.findViewById<Spinner>(R.id.spinnerModel)
        val editFallbackModel = view.findViewById<EditText>(R.id.editFallbackModel)

        val editContextWindow = view.findViewById<EditText>(R.id.editContextWindow)
        val editMaxTokens = view.findViewById<EditText>(R.id.editMaxTokens)
        val editTemperature = view.findViewById<EditText>(R.id.editTemperature)
        val editTopP = view.findViewById<EditText>(R.id.editTopP)

        val editSystemPrompt = view.findViewById<EditText>(R.id.editSystemPrompt)
        val editTools = view.findViewById<EditText>(R.id.editTools)
        val editMemory = view.findViewById<EditText>(R.id.editMemory)
        val editPermissions = view.findViewById<EditText>(R.id.editPermissions)

        // Load providers into spinner
        val providersList = mutableListOf("openai", "deepseek", "hermes", "openclaw/local", "custom")
        val providersAdapter = ArrayAdapter<String>(requireContext(), android.R.layout.simple_spinner_item, providersList)
        providersAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerProvider.adapter = providersAdapter

        // Load models into spinner
        val modelsAdapter = ArrayAdapter<String>(requireContext(), android.R.layout.simple_spinner_item, mutableListOf("Loading..."))
        modelsAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerModel.adapter = modelsAdapter

        spinnerProvider.onItemSelectedListener = object : android.widget.AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: android.widget.AdapterView<*>?, view: View?, position: Int, id: Long) {
                val selectedProvider = providersAdapter.getItem(position)
                if (selectedProvider == "deepseek") {
                    modelsAdapter.clear()
                    modelsAdapter.addAll("deepseek-chat", "deepseek-reasoner")
                    modelsAdapter.notifyDataSetChanged()
                } else {
                    // Triggers load again if provider changes
                    ApiClient.getModels(requireContext()) { modelsList, err ->
                        activity?.runOnUiThread {
                            if (err != null || modelsList == null) {
                                modelsAdapter.clear()
                                modelsAdapter.add("Error loading")
                            } else {
                                modelsAdapter.clear()
                                val mList = mutableListOf<String>()
                                for (i in 0 until modelsList.length()) mList.add(modelsList.optString(i))
                                if (mList.isEmpty()) mList.add("No models")
                                modelsAdapter.addAll(mList)
                            }
                            modelsAdapter.notifyDataSetChanged()
                        }
                    }
                }
            }
            override fun onNothingSelected(parent: android.widget.AdapterView<*>?) {}
        }

        ApiClient.getModels(requireContext()) { modelsList, err ->
            activity?.runOnUiThread {
                if (err != null || modelsList == null) {
                    modelsAdapter.clear()
                    modelsAdapter.add("Error loading")
                    modelsAdapter.notifyDataSetChanged()
                } else {
                    modelsAdapter.clear()
                    val mList = mutableListOf<String>()
                    for (i in 0 until modelsList.length()) {
                        mList.add(modelsList.optString(i))
                    }
                    if (mList.isEmpty()) mList.add("No models")
                    modelsAdapter.addAll(mList)
                    modelsAdapter.notifyDataSetChanged()

                    if (initialAgentData != null) {
                        try {
                            val agent = JSONObject(initialAgentData!!)
                            val curModel = agent.optString("model")
                            val pos = mList.indexOf(curModel)
                            if (pos >= 0) {
                                spinnerModel.setSelection(pos)
                            }
                        } catch(e: Exception) {}
                    }
                }
            }
        }

        if (initialAgentData != null) {
            try {
                val agent = JSONObject(initialAgentData!!)
                txtEditorTitle.text = "Editeaza: ${agent.optString("name")}"
                
                editAgentName.setText(agent.optString("name"))
                editAgentSlug.setText(agent.optString("id"))
                editAgentRole.setText(agent.optString("role"))
                
                val p = agent.optString("provider")
                val pIdx = providersList.indexOf(p)
                if (pIdx >= 0) spinnerProvider.setSelection(pIdx)
                
                editEndpoint.setText(agent.optString("endpoint"))
                editFallbackModel.setText(agent.optString("fallback_model"))
                
                editContextWindow.setText(agent.optInt("context_window", 8192).toString())
                editMaxTokens.setText(agent.optInt("max_tokens", 4096).toString())
                editTemperature.setText(agent.optDouble("temperature", 0.7).toString())
                editTopP.setText(agent.optDouble("top_p", 1.0).toString())
                
                editSystemPrompt.setText(agent.optString("system_prompt"))
                editTools.setText(agent.optString("tools"))
                editMemory.setText(agent.optString("memory"))
                editPermissions.setText(agent.optString("permissions"))

            } catch (e: Exception) {
                e.printStackTrace()
            }
        } else {
            txtEditorTitle.text = "Agent Nou"
        }

        btnBack.setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        btnSaveAgent.setOnClickListener {
            val updated = JSONObject()
            updated.put("name", editAgentName.text.toString().trim())
            updated.put("id", editAgentSlug.text.toString().trim())
            updated.put("role", editAgentRole.text.toString().trim())
            updated.put("provider", spinnerProvider.selectedItem?.toString() ?: "")
            updated.put("endpoint", editEndpoint.text.toString().trim())
            updated.put("model", spinnerModel.selectedItem?.toString() ?: "")
            updated.put("fallback_model", editFallbackModel.text.toString().trim())
            
            updated.put("context_window", editContextWindow.text.toString().toIntOrNull() ?: 8192)
            updated.put("max_tokens", editMaxTokens.text.toString().toIntOrNull() ?: 4096)
            updated.put("temperature", editTemperature.text.toString().toDoubleOrNull() ?: 0.7)
            updated.put("top_p", editTopP.text.toString().toDoubleOrNull() ?: 1.0)
            
            updated.put("system_prompt", editSystemPrompt.text.toString().trim())
            updated.put("tools", editTools.text.toString().trim())
            updated.put("memory", editMemory.text.toString().trim())
            updated.put("permissions", editPermissions.text.toString().trim())

            val reqContext = context
            if (reqContext != null) {
                Toast.makeText(reqContext, "Salvand...", Toast.LENGTH_SHORT).show()
                ApiClient.saveAgentConfig(reqContext, updated) { success, err ->
                    activity?.runOnUiThread {
                        if (success) {
                            Toast.makeText(reqContext, "Agent salvat cu succes!", Toast.LENGTH_SHORT).show()
                            parentFragmentManager.popBackStack()
                        } else {
                            Toast.makeText(reqContext, "Eroare: ${err?.localizedMessage}", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }
        }

        return view
    }
}
