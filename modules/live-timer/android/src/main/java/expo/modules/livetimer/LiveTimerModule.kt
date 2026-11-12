package expo.modules.livetimer

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/** What the live timer notification shows. */
class LiveTimerOptions : Record {
  @Field var title: String = ""
  @Field var text: String = ""
  /** Start time (counting up) or end time (counting down), in ms since the epoch. */
  @Field var base: Double = 0.0
  @Field var countDown: Boolean = false
  @Field var color: String = "#AEF77F"
  /** Remove the notification by itself after this many ms (0 = keep). */
  @Field var timeoutMs: Double = 0.0
}

/**
 * One ongoing notification with a live clock (Android's chronometer), for the running
 * workout or rest timer. The clock ticks on its own, so it stays right on the lock screen
 * even while the app is in the background.
 */
class LiveTimerModule : Module() {
  private val channelId = "live-timer"
  private val notificationId = 4217

  override fun definition() = ModuleDefinition {
    Name("LiveTimer")

    Function("show") { options: LiveTimerOptions ->
      val context = appContext.reactContext ?: return@Function false
      show(context, options)
    }

    Function("hide") {
      val context = appContext.reactContext ?: return@Function false
      NotificationManagerCompat.from(context).cancel(notificationId)
      true
    }
  }

  @SuppressLint("MissingPermission")
  private fun show(context: Context, o: LiveTimerOptions): Boolean {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return false

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(channelId, "Workout timer", NotificationManager.IMPORTANCE_LOW).apply {
        description = "The running workout or rest timer"
        setShowBadge(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
    }

    // Tapping the notification opens Gainmark where it was.
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val pending = launch?.let {
      PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    var icon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    if (icon == 0) icon = context.applicationInfo.icon
    val color = try {
      Color.parseColor(o.color)
    } catch (e: IllegalArgumentException) {
      Color.WHITE
    }

    val builder = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(icon)
      .setContentTitle(o.title)
      .setContentText(o.text)
      .setColor(color)
      .setWhen(o.base.toLong())
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(o.countDown)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_LOW)
    if (pending != null) builder.setContentIntent(pending)
    if (o.timeoutMs > 0) builder.setTimeoutAfter(o.timeoutMs.toLong())

    return try {
      manager.notify(notificationId, builder.build())
      true
    } catch (e: SecurityException) {
      false
    }
  }
}
