package com.pelajaran.mentalhealth

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.card.MaterialCardView
import android.widget.TextView

class HistoryBottomSheet : BottomSheetDialogFragment() {
    private lateinit var emotionHistory: List<Map<String, Float>>
    private lateinit var recyclerView: RecyclerView
    private lateinit var adapter: EmotionAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.bottom_sheet_history, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val mainActivity = activity as MainActivity
        emotionHistory = mainActivity.getEmotionHistory()

        recyclerView = view.findViewById(R.id.emotion_recycler_view)
        recyclerView.layoutManager = LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)

        adapter = EmotionAdapter(emotionHistory)
        recyclerView.adapter = adapter
    }

    fun updateEmotionHistory(newEmotions: Map<String, Float>) {
        emotionHistory = emotionHistory + newEmotions
        if (emotionHistory.size > 6) emotionHistory = emotionHistory.takeLast(6)
        adapter.notifyDataSetChanged()
    }

    companion object {
        fun newInstance(): HistoryBottomSheet {
            return HistoryBottomSheet()
        }
    }
}

class EmotionAdapter(private val emotionHistory: List<Map<String, Float>>) : RecyclerView.Adapter<EmotionAdapter.EmotionViewHolder>() {
    private val colors = listOf("#90C17D", "#FF7843", "#6C5CE7", "#00B894", "#FF7675", "#74B9FF") // Warna pastel untuk setiap card
    private val emotions = listOf("happy", "sad", "angry", "neutral", "surprised") // Daftar emosi

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): EmotionViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.emotion_card, parent, false)
        return EmotionViewHolder(view)
    }

    override fun onBindViewHolder(holder: EmotionViewHolder, position: Int) {
        val emotion = emotions[position % emotions.size]
        val percent = emotionHistory.last()[emotion] ?: 0f
        holder.bind(emotion, percent, colors[position % colors.size])
    }

    override fun getItemCount(): Int {
        return emotions.size // 5 emosi
    }

    class EmotionViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val emotionText = itemView.findViewById<TextView>(R.id.emotion_text)
        private val emotionPercent = itemView.findViewById<TextView>(R.id.emotion_percent)
        private val cardView = itemView.findViewById<MaterialCardView>(R.id.emotion_card)

        fun bind(emotion: String, percent: Float, color: String) {
            emotionText.text = emotion.replaceFirstChar { it.uppercase() }
            emotionPercent.text = "%.1f%%".format(percent)
            cardView.setCardBackgroundColor(Color.parseColor(color))
        }
    }
}