package com.pelajaran.mentalhealth

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import androidx.work.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.URL
import java.util.concurrent.TimeUnit

class MentalHealthSensorWidget2x1 : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        scheduleWorker(context)
    }

    companion object {
        fun updateWidget(context: Context, gsrValue: String, bpmValue: String, luxValue: String) {
            val views = RemoteViews(context.packageName, R.layout.widget_layout_sensor_2x1)
            views.setTextViewText(R.id.gsr_value, gsrValue)
            views.setTextViewText(R.id.bpm_value, bpmValue)
            views.setTextViewText(R.id.lux_value, luxValue)

            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, MentalHealthSensorWidget2x1::class.java)
            appWidgetManager.updateAppWidget(componentName, views)
        }
    }
}

class FetchDataWorker(context: Context, workerParams: WorkerParameters) : CoroutineWorker(context, workerParams) {
    override suspend fun doWork(): Result {
        return try {
            val gsrData = fetchJson("https://4211421036.github.io/MentalHealth/GSR.json")
            val maxData = fetchJson("https://4211421036.github.io/MentalHealth/MAX30102.json")
            val bhData = fetchJson("https://4211421036.github.io/MentalHealth/BH7010.json")

            val gsrValue = gsrData?.getDouble("tonic")?.toString() ?: "0"
            val bpmValue = maxData?.getInt("bpm")?.toString() ?: "0"
            val luxValue = bhData?.getDouble("lux")?.let {
                toString().format("%.2f", it) // Format ke 2 digit desimal
            } ?: "0"

            MentalHealthSensorWidget2x1.updateWidget(applicationContext, gsrValue, bpmValue, luxValue)
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private suspend fun fetchJson(url: String): JSONObject? {
        return withContext(Dispatchers.IO) {
            try {
                val response = URL(url).readText()
                JSONObject(response)
            } catch (e: Exception) {
                null
            }
        }
    }
}

fun scheduleWorker(context: Context) {
    val workRequest = PeriodicWorkRequestBuilder<FetchDataWorker>(1, TimeUnit.SECONDS)
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork("FetchDataWorker", ExistingPeriodicWorkPolicy.KEEP, workRequest)
}