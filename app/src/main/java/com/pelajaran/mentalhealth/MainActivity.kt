package com.pelajaran.mentalhealth

import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.Bundle
import android.Manifest
import android.content.Context
import android.util.Log
import android.view.WindowManager
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mediapipe.formats.proto.LandmarkProto
import com.google.mediapipe.solutions.facemesh.FaceMesh
import com.google.mediapipe.solutions.facemesh.FaceMeshOptions
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import android.view.View
import android.view.ViewStub
import androidx.core.app.ActivityCompat
import android.widget.ImageView
import android.content.pm.PackageManager
import kotlin.math.roundToInt


class MainActivity : AppCompatActivity() {
    private lateinit var emotionTextView: TextView
    private lateinit var previewView: PreviewView
    private lateinit var cameraExecutor: ExecutorService
    private lateinit var faceMesh: FaceMesh
    private var camera: Camera? = null
    private var lensFacing = CameraSelector.LENS_FACING_FRONT
    private val emotionDetector = EmotionDetector()
    private val emotionHistory = mutableListOf<Map<String, Float>>()
    private var historyBottomSheet: HistoryBottomSheet? = null
    private var chartBottomSheet: ChartBottomSheet? = null

    // Tambahkan permission check untuk audio
    private fun checkPermissions(): Boolean {
        val permissions = arrayOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )

        return if (permissions.any {
                ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
            }) {
            ActivityCompat.requestPermissions(this, permissions, 101)
            false
        } else {
            true
        }
    }

    companion object {
        const val FRAGMENT_HOME = 0
        const val FRAGMENT_CHART = 1
        const val FRAGMENT_HISTORY = 2
    }

    private var currentFragment = FRAGMENT_HOME

    private fun includeLayout() {
        val navContainer = findViewById<ViewStub>(R.id.nav_container)
        navContainer?.layoutResource = R.layout.bottom_navbar
        navContainer?.inflate()
    }

    fun onNavItemClicked(view: View) {
        when(view.id) {
            R.id.menu_home -> {
                closeBottomSheets()
                loadHomeFragment()
            }
            R.id.menu_chart -> {
                closeBottomSheets()
                chartBottomSheet = ChartBottomSheet.newInstance()
                chartBottomSheet?.show(supportFragmentManager, "ChartBottomSheet")
            }
            R.id.menu_history -> {
                closeBottomSheets()
                historyBottomSheet = HistoryBottomSheet.newInstance()
                historyBottomSheet?.show(supportFragmentManager, "HistoryBottomSheet")
            }
        }
        updateMenuStates(view.id)
    }

    private fun closeBottomSheets() {
        historyBottomSheet?.dismiss()
        historyBottomSheet = null

        chartBottomSheet?.dismiss()
        chartBottomSheet = null
    }

    private fun setupNavigation() {
        findViewById<ImageView>(R.id.menu_home).isSelected = true
    }


    private fun updateMenuStates(selectedId: Int) {
        listOf(R.id.menu_home, R.id.menu_chart, R.id.menu_history).forEach { id ->
            findViewById<ImageView>(id).isSelected = id == selectedId
        }
    }

    private fun loadHomeFragment() {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, HomeFragment())
            .commit()
        currentFragment = FRAGMENT_HOME
    }

    private fun loadChartFragment() {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, ChartFragment())
            .addToBackStack(null)
            .commit()
        currentFragment = FRAGMENT_CHART
    }

    private fun loadHistoryFragment() {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragment_container, HistoryFragment())
            .addToBackStack(null)
            .commit()
        currentFragment = FRAGMENT_HISTORY
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        previewView = findViewById(R.id.preview_view)
        emotionTextView = findViewById(R.id.emotion_text)
        cameraExecutor = Executors.newSingleThreadExecutor()

        // Tambahkan navbar
        includeLayout()
        setupNavigation()
        loadHomeFragment()
        setupFaceMesh()
        if (checkCameraPermission()) {
            startCamera()
        }
    }

    private fun checkCameraPermission(): Boolean {
        return if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 101)
            false
        } else {
            true
        }
    }

    private fun updateEmotionUI(emotions: Map<String, Float>) {
        emotionHistory.add(emotions)

        // Batasi ukuran history
        if (emotionHistory.size > 10) emotionHistory.removeAt(0)

        // Update UI dengan semua emosi
        val text = buildString {
            append("Detected Emotions:\n")
            emotions.forEach { (emotion, percent) ->
                append("${emotion.replaceFirstChar { it.uppercase() }}: ${"%.1f".format(percent)}%\n")
            }
            append("\nConclusion: ${getMentalHealthStatus()}")
        }

        emotionTextView.text = text

        // Simpan data mental health ke SharedPreferences
        saveMentalHealthData(getMentalHealthStatus(), getRecommendation())
    }

    private fun getMentalHealthStatus(): String {
        return when {
            emotionHistory.count { it["sad"] ?: 0f > 0.5f } > 5 -> "Potential Depression"
            emotionHistory.count { it["angry"] ?: 0f > 0.5f } > 5 -> "Potential Anger Issues"
            emotionHistory.count { it["neutral"] ?: 0f > 0.5f } > 8 -> "Stable Mental State"
            else -> "Normal"
        }
    }

    private fun setupFaceMesh() {
        val options = FaceMeshOptions.builder()
            .setRefineLandmarks(true)
            .setStaticImageMode(false)
            .setMinDetectionConfidence(0.7f)
            .setMinTrackingConfidence(0.7f)
            .build()

        faceMesh = FaceMesh(this, options)
        faceMesh.setResultListener { result ->
            result?.multiFaceLandmarks()?.let { faces ->
                runOnUiThread { processFaceLandmarks(faces) }
            }
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            val preview = Preview.Builder()
                .setTargetRotation(previewView.display.rotation)
                .build()
                .also { it.surfaceProvider = previewView.surfaceProvider }

            val imageAnalysis = ImageAnalysis.Builder()
                .setTargetRotation(previewView.display.rotation)
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor) { imageProxy ->
                        processImageProxy(imageProxy)
                    }
                }

            val cameraSelector = CameraSelector.Builder()
                .requireLensFacing(lensFacing)
                .build()

            try {
                cameraProvider.unbindAll()
                camera = cameraProvider.bindToLifecycle(
                    this,
                    cameraSelector,
                    preview,
                    imageAnalysis
                )
            } catch (exc: Exception) {
                Log.e("CameraX", "Use case binding failed", exc)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private var bitmap: Bitmap? = null

    private fun processImageProxy(imageProxy: ImageProxy) {
        val rotationDegrees = imageProxy.imageInfo.rotationDegrees.toFloat()
        bitmap = imageProxy.toBitmap().rotate(rotationDegrees)

        bitmap?.let {
            faceMesh.send(it, System.currentTimeMillis())
        }
        imageProxy.close()
    }

    private fun processFaceLandmarks(faces: List<LandmarkProto.NormalizedLandmarkList>) {
        val overlayView = findViewById<FaceLandmarkOverlayView>(R.id.faceLandmarkOverlayView)
        val previewView = findViewById<PreviewView>(R.id.preview_view)

        if (faces.isNotEmpty() && bitmap != null) {
            val face = faces.first()

            // Emotion detection
            val emotions = emotionDetector.detectEmotions(face.landmarkList)
            runOnUiThread { updateEmotionUI(emotions) }

            // Landmark processing
            val (minX, maxX, minY, maxY) = calculateFaceBoundingBox(face)
            val landmarks = processLandmarks(
                face = face,
                bitmap = bitmap!!,
                previewView = previewView,
                minX = minX,
                maxX = maxX,
                minY = minY,
                maxY = maxY
            )
            overlayView.updateLandmarks(landmarks)
        } else {
            overlayView.updateLandmarks(emptyList())
            runOnUiThread { emotionTextView.text = buildString {
        append("No face detected")
    } }
        }
    }
    fun getEmotionHistory(): List<Map<String, Float>> {
        return emotionHistory
    }

    private fun calculateFaceBoundingBox(face: LandmarkProto.NormalizedLandmarkList): Quadruple<Float> {
        var minX = 1f
        var maxX = 0f
        var minY = 1f
        var maxY = 0f

        face.landmarkList.forEach { landmark ->
            minX = minOf(minX, landmark.x)
            maxX = maxOf(maxX, landmark.x)
            minY = minOf(minY, landmark.y)
            maxY = maxOf(maxY, landmark.y)
        }

        return Quadruple(minX, maxX, minY, maxY)
    }

    private fun processLandmarks(
        face: LandmarkProto.NormalizedLandmarkList,
        bitmap: Bitmap,
        previewView: PreviewView,
        minX: Float,
        maxX: Float,
        minY: Float,
        maxY: Float
    ): List<Pair<Float, Float>> {
        val faceWidth = (maxX - minX) * bitmap.width
        val faceHeight = (maxY - minY) * bitmap.height

        return face.landmarkList.map { landmark ->
            var x = (landmark.x - minX) * faceWidth
            var y = (landmark.y - minY) * faceHeight

            val scaleX = (previewView.width / faceWidth) * 1.6f
            val scaleY = previewView.height / faceHeight

            x *= scaleX
            y *= scaleY

            Pair(x, y)
        }
    }
    private fun getRecommendation(): String {
        return when {
            emotionHistory.count { it["sad"] ?: 0f > 0.5f } > 5 -> "Cobalah untuk berbicara dengan seseorang atau mencari bantuan profesional."
            emotionHistory.count { it["angry"] ?: 0f > 0.5f } > 5 -> "Cobalah teknik relaksasi seperti meditasi atau pernapasan dalam."
            emotionHistory.count { it["neutral"] ?: 0f > 0.5f } > 8 -> "Pertahankan kebiasaan baik Anda."
            else -> "Tetap tenang dan jaga kesehatan mental Anda."
        }
    }
    private fun saveMentalHealthData(conclusion: String, recommendation: String) {
        val sharedPreferences = getSharedPreferences("MentalHealthPrefs", Context.MODE_PRIVATE)
        val editor = sharedPreferences.edit()
        editor.putString("conclusion", conclusion)
        editor.putString("recommendation", recommendation)
        editor.apply()

        // Perbarui widget
        MentalHealthWidget4x1.updateWidget(this)
        MentalHealthWidget2x1.updateWidget(this)
    }

    override fun onResume() {
        super.onResume()
        // Perbarui widget saat aplikasi dibuka
        MentalHealthWidget4x1.updateWidget(this)
        MentalHealthWidget2x1.updateWidget(this)
    }

    override fun onDestroy() {
        super.onDestroy()
        faceMesh.close()
        cameraExecutor.shutdown()
    }

    private fun Bitmap.rotate(degrees: Float): Bitmap {
        val matrix = Matrix().apply { postRotate(degrees) }
        return Bitmap.createBitmap(this, 0, 0, width, height, matrix, true)
    }

    private data class Quadruple<out T>(val first: T, val second: T, val third: T, val fourth: T)
}
