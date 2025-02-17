package com.pelajaran.mentalhealth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.button.MaterialButton

class ChartBottomSheet : BottomSheetDialogFragment() {
    private var btnDay: MaterialButton? = null
    private var btnWeek: MaterialButton? = null
    private var btnMonth: MaterialButton? = null
    private var btnYear: MaterialButton? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.bottom_sheet_chart, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupButtons()
    }

    private fun setupButtons() {

    }

    companion object {
        fun newInstance(): ChartBottomSheet {
            return ChartBottomSheet()
        }
    }
}
