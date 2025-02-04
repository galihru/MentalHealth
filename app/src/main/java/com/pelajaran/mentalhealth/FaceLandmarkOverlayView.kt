package com.pelajaran.mentalhealth

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import com.google.mediapipe.solutions.facemesh.FaceMeshConnections

class FaceLandmarkOverlayView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val landmarks = mutableListOf<Pair<Float, Float>>()
    private val paint = Paint().apply {
        color = Color.RED
        style = Paint.Style.FILL
        strokeWidth = 5f
    }

    private val textPaint = Paint().apply {
        color = Color.WHITE
        textSize = 50f
        typeface = Typeface.DEFAULT_BOLD
    }

    fun updateLandmarks(newLandmarks: List<Pair<Float, Float>>) {
        landmarks.clear()
        landmarks.addAll(newLandmarks)
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Gambar titik landmark wajah
        landmarks.forEach { (x, y) ->
            canvas.drawCircle(x, y, 5f, paint)
        }

        // Gambar koneksi antar titik wajah
        drawFaceConnections(canvas)
    }

    private fun drawFaceConnections(canvas: Canvas) {
        val linePaint = Paint().apply {
            color = Color.GREEN
            style = Paint.Style.STROKE
            strokeWidth = 1f
        }

        FaceMeshConnections.FACEMESH_TESSELATION.forEach { connection ->
            val startIdx = connection.start()
            val endIdx = connection.end()

            if (startIdx < landmarks.size && endIdx < landmarks.size) {
                val start = landmarks[startIdx]
                val end = landmarks[endIdx]
                canvas.drawLine(start.first, start.second, end.first, end.second, linePaint)
            }
        }
    }
}
