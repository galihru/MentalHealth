package com.pelajaran.mentalhealth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.camera.core.*
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.RecyclerView

class HistoryFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val view = inflater.inflate(R.layout.fragment_history, container, false)
        setupRecyclerView(view.findViewById(R.id.recyclerView))
        return view
    }

    private fun setupRecyclerView(recyclerView: RecyclerView) {
        // Implementasi RecyclerView dengan data history
    }
}