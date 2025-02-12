package com.pelajaran.mentalhealth

import com.google.mediapipe.formats.proto.LandmarkProto
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.roundToInt

class EmotionDetector {

    private val emotionWeights = mapOf(
        "happy" to listOf(0.70f to "AU12", 0.25f to "AU6", 0.05f to "AU25"),
        "angry" to listOf(0.55f to "AU4", 0.25f to "AU7", 0.15f to "AU23", 0.05f to "AU5"),
        "surprised" to listOf(0.65f to "AU5", 0.20f to "AU1", 0.15f to "AU2"),
        "sad" to listOf(0.60f to "AU1", 0.25f to "AU4", 0.15f to "AU15"),
        "neutral" to listOf(0.95f to "NEUTRAL", 0.05f to "AU0")
    )

    private val auThresholds = mapOf(
        "AU1" to 0.18f,
        "AU2" to 0.22f,
        "AU4" to 0.15f,
        "AU5" to 0.25f,
        "AU6" to 0.30f,
        "AU7" to 0.18f,
        "AU12" to 0.35f,
        "AU15" to 0.25f,
        "AU23" to 0.30f,
        "AU25" to 0.40f,
        "AU26" to 0.45f
    )

    private var auValues: Map<String, Float> = emptyMap()

    fun detectEmotions(landmarks: List<LandmarkProto.NormalizedLandmark>): Map<String, Float> {
        auValues = calculateActionUnits(landmarks)

        val emotionScores = mutableMapOf<String, Float>()
        for ((emotion, weightedAUs) in emotionWeights) {
            var score = 0f
            for ((weight, au) in weightedAUs) {
                if (au == "NEUTRAL") {
                    score = if (auValues.isNotEmpty()) 0.95f else 1f
                    break
                }
                if (au == "AU0") {
                    score = if (auValues.isNotEmpty()) 0.05f else 0f
                    break
                }
                val auValue = auValues[au] ?: 0f
                score += weight * auValue
            }
            emotionScores[emotion] = score
        }
        return emotionScores
    }

    fun getMentalHealthInsights(emotions: Map<String, Float>): String {
        return generateMentalHealthInsights(emotions)
    }

    private fun generateMentalHealthInsights(emotions: Map<String, Float>): String {
        val insights = mutableListOf<String>()

        emotions["sad"]?.let { sadScore ->
            if (sadScore > 0.35f) {
                insights.add("Potential signs of sadness detected (score: ${sadScore.roundToInt()}). Consider further assessment.")
                auValues["AU15"]?.let { if (it > 0.25f) insights.add("Increased AU15 activity may indicate sadness.") }
                auValues["AU1"]?.let { if (it > 0.25f) insights.add("Increased AU1 activity may indicate sadness.") }
            }
        }

        emotions["happy"]?.let { happyScore ->
            if (happyScore > 0.40f) {
                insights.add("Potential signs of happiness detected (score: ${happyScore.roundToInt()}).")
                auValues["AU6"]?.let { if (it > 0.30f) insights.add("Duchenne smile detected, suggesting genuine happiness.") }
            }
        }

        emotions["angry"]?.let { angryScore ->
            if (angryScore > 0.30f) {
                insights.add("Potential signs of anger detected (score: ${angryScore.roundToInt()}).")
                auValues["AU4"]?.let { if (it > 0.20f) insights.add("Increased AU4 activity may indicate anger.") }
            }
        }

        emotions["surprised"]?.let { surprisedScore ->
            if (surprisedScore > 0.30f) {
                insights.add("Potential signs of surprise detected (score: ${surprisedScore.roundToInt()}).")
                auValues["AU1"]?.let { if (it > 0.20f) insights.add("Increased AU1 activity may indicate surprise.") }
                auValues["AU2"]?.let { if (it > 0.20f) insights.add("Increased AU2 activity may indicate surprise.") }
                auValues["AU5"]?.let { if (it > 0.30f) insights.add("Increased AU5 activity may indicate surprise.") }
            }
        }

        emotions["neutral"]?.let { neutralScore ->
            if (neutralScore > 0.60f) {
                insights.add("Predominantly neutral expression detected (score: ${neutralScore.roundToInt()}).")
            }
        }

        return insights.takeIf { it.isNotEmpty() }?.joinToString("\n") ?: "No significant emotional expressions detected."
    }

    private fun calculateActionUnits(landmarks: List<LandmarkProto.NormalizedLandmark>): Map<String, Float> {
        return mapOf(
            "AU1" to calculateBrowMovement(landmarks, 105, 334),
            "AU2" to calculateBrowMovement(landmarks, 107, 336),
            "AU4" to calculateBrowLower(landmarks),
            "AU5" to calculateUpperLidRaise(landmarks),
            "AU6" to calculateCheekRaise(landmarks),
            "AU7" to calculateLidTighten(landmarks),
            "AU12" to calculateLipStretch(landmarks),
            "AU15" to calculateLipDepression(landmarks),
            "AU23" to calculateLipPress(landmarks),
            "AU25" to calculateLipPart(landmarks),
            "AU26" to calculateJawDrop(landmarks)
        )
    }

    private fun calculateBrowMovement(landmarks: List<LandmarkProto.NormalizedLandmark>, leftIdx: Int, rightIdx: Int): Float {
        val reference = landmarks[168]
        val leftBrow = landmarks[leftIdx]
        val rightBrow = landmarks[rightIdx]

        val displacement = ((reference.y - leftBrow.y) + (reference.y - rightBrow.y)) / 2
        return (displacement / auThresholds["AU1"]!!).coerceIn(0f, 1f)
    }

    private fun calculateUpperLidRaise(landmarks: List<LandmarkProto.NormalizedLandmark>): Float {
        val leftUpperLid = landmarks[386]
        val rightUpperLid = landmarks[159]
        val eyeCenter = landmarks[468]

        val leftRaise = eyeCenter.y - leftUpperLid.y
        val rightRaise = eyeCenter.y - rightUpperLid.y
        val avgRaise = (leftRaise + rightRaise) / 2

        return (avgRaise / auThresholds["AU5"]!!).coerceIn(0f, 1f)
    }

    private fun calculateCheekRaise(landmarks: List<LandmarkProto.NormalizedLandmark>): Float {
        val leftCheek = landmarks[116]
        val rightCheek = landmarks[345]
        val noseTip = landmarks[4]

        val leftDist = hypot((leftCheek.x - noseTip.x).toDouble(), (leftCheek.y - noseTip.y).toDouble()).toFloat()
        val rightDist = hypot((rightCheek.x - noseTip.x).toDouble(), (rightCheek.y - noseTip.y).toDouble()).toFloat()

        return (1 - (leftDist + rightDist)/2 / auThresholds["AU6"]!!).coerceIn(0f, 1f)
    }

    private fun calculateLidTighten(landmarks: List<LandmarkProto.NormalizedLandmark>): Float {
        val leftUpper = landmarks[385]
        val leftLower = landmarks[390]
        val rightUpper = landmarks[158]
        val rightLower = landmarks[160]

        val leftTightness = abs(leftUpper.y - leftLower.y)
        val rightTightness = abs(rightUpper.y - rightLower.y)

        return ((leftTightness + rightTightness) / 2 / auThresholds["AU7"]!!).coerceIn(0f, 1f)
    }

    private fun calculateLipDepression(landmarks: List<LandmarkProto.NormalizedLandmark>): Float {
        val lipLeft = landmarks[61]
        val lipRight = landmarks[291]
        val lipCenter = landmarks[95]

        val leftDepression = lipLeft.y - lipCenter.y
        val rightDepression = lipRight.y - lipCenter.y

        return ((leftDepression + rightDepression) / 2 / auThresholds["AU15"]!!).coerceIn(0f, 1f)
    }

    private fun calculateLipPress(landmarks: List<LandmarkProto.NormalizedLandmark>): Float {
        val upperLip = landmarks[13]
        val lowerLip = landmarks[14]
        val lipHeight = abs(upperLip.y - lowerLip.y)

        return (lipHeight / auThresholds["AU23"]!!).coerceIn(0f, 1f)
    }

    private fun calculateLipPart(landmarks: List<LandmarkProto.NormalizedLandmark>): Float {
        val upperLip = landmarks[13]
        val lowerLip = landmarks[14]
        return (abs(upperLip.y - lowerLip.y) / auThresholds["AU25"]!!).coerceIn(0f, 1f)
    }

    private fun calculateJawDrop(landmarks: List<LandmarkProto.NormalizedLandmark>): Float {
        val jaw = landmarks[152]
        val noseBase = landmarks[6]
        return (abs(jaw.y - noseBase.y) / auThresholds["AU26"]!!).coerceIn(0f, 1f)
    }

    private fun calculateBrowLower(landmarks: List<LandmarkProto.NormalizedLandmark>): Float {
        val leftBrow = landmarks[112]
        val rightBrow = landmarks[341]
        val reference = landmarks[151] // Mid forehead

        val displacement = ((leftBrow.y - reference.y) + (rightBrow.y - reference.y)) / 2
        return (displacement / auThresholds["AU4"]!!).coerceIn(0f, 1f)
    }

    private fun calculateLipStretch(landmarks: List<LandmarkProto.NormalizedLandmark>): Float {
        val leftLip = landmarks[61]
        val rightLip = landmarks[291]
        val normFactor = landmarks[454].x - landmarks[234].x // Face width

        val stretch = hypot((rightLip.x - leftLip.x).toDouble(), (rightLip.y - leftLip.y).toDouble()).toFloat()
        return (stretch / normFactor / auThresholds["AU12"]!!).coerceIn(0f, 1f)
    }
}