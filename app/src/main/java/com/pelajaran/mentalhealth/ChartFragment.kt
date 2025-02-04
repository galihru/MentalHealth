package com.pelajaran.mentalhealth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.camera.core.*
import androidx.fragment.app.Fragment

class ChartFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val view = inflater.inflate(R.layout.fragment_chart, container, false)
        setupChart(view.findViewById(R.id.chart))
        return view
    }

    private fun setupChart(chart: LineChart) {
        // Implementasi chart menggunakan MPAndroidChart
    }
}