package com.pelajaran.mentalhealth

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

class MentalHealthWidget4x1 : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val sharedPreferences = context.getSharedPreferences("MentalHealthPrefs", Context.MODE_PRIVATE)
        val conclusion = sharedPreferences.getString("conclusion", "Normal") ?: "Normal"
        val recommendation = sharedPreferences.getString("recommendation", "No recommendation") ?: "No recommendation"

        val views = RemoteViews(context.packageName, R.layout.widget_layout_4x1)
        views.setTextViewText(R.id.widget_conclusion, conclusion)
        views.setTextViewText(R.id.widget_recommendation, "Rekomendasi: $recommendation")

        // Intent untuk membuka aplikasi saat widget diklik
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    companion object {
        fun updateWidget(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val ids = appWidgetManager.getAppWidgetIds(ComponentName(context, MentalHealthWidget4x1::class.java))
            val intent = Intent(context, MentalHealthWidget4x1::class.java)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }
}