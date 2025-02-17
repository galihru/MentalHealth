package com.pelajaran.mentalhealth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.camera.core.*
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.RecyclerView

class HistoryFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return TextView(requireContext()).apply {
            text = "History Fragment"
        }
    }
}