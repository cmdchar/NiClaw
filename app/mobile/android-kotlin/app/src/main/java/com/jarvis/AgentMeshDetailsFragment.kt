package com.jarvis

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.fragment.app.Fragment
import org.json.JSONObject

class AgentMeshDetailsFragment : Fragment() {

    private lateinit var nodeJson: JSONObject

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arguments?.getString("nodeJson")?.let {
            nodeJson = try { JSONObject(it) } catch (e: Exception) { JSONObject() }
        } ?: run {
            nodeJson = JSONObject()
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        val view = inflater.inflate(R.layout.fragment_agent_mesh_details, container, false)
        
        view.findViewById<ImageButton>(R.id.btnDetailsBack).setOnClickListener {
            parentFragmentManager.popBackStack()
        }

        val lblNodeName = view.findViewById<TextView>(R.id.lblNodeName)
        val lblNodeStatus = view.findViewById<TextView>(R.id.lblNodeStatus)
        val txtDetailsContent = view.findViewById<TextView>(R.id.txtDetailsContent)

        lblNodeName.text = nodeJson.optString("label", "Unknown Node")
        lblNodeStatus.text = "Status: "

        val detailsObj = nodeJson.optJSONObject("details")
        if (detailsObj != null && detailsObj.length() > 0) {
            val formatted = StringBuilder()
            val keys = detailsObj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                val value = detailsObj.optString(key)
                formatted.append(":\n\n\n")
            }
            txtDetailsContent.text = formatted.toString().trim()
        } else {
            val detailsStr = nodeJson.optString("details")
            if (detailsStr.isNotEmpty() && detailsStr != "null" && detailsStr != "{}") {
                txtDetailsContent.text = detailsStr
            } else {
                txtDetailsContent.text = "Informații lipsă. Nodul nu a raportat detalii sau metrics."
            }
        }

        return view
    }

    companion object {
        fun newInstance(nodeJsonStr: String): AgentMeshDetailsFragment {
            val fragment = AgentMeshDetailsFragment()
            val args = Bundle()
            args.putString("nodeJson", nodeJsonStr)
            fragment.arguments = args
            return fragment
        }
    }
}
