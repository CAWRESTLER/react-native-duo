package com.cawrestler.reactnativeduo

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.graphics.Rect
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import androidx.core.util.Consumer
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.views.view.ReactViewGroup
import org.json.JSONArray
import org.json.JSONObject

/**
 * Reports Android foldable posture in the same environment payload the iOS view emits.
 *
 * Jetpack WindowManager supplies the fold's bounds, state, and occlusion; the optional
 * hinge-angle sensor (API 30+) supplies the angle. iPhone Duo-specific fields stay at
 * their fallback values (`isDuo` and `supportsDuoApis` are false, no cameras).
 */
class RNDuoEnvironmentView(context: Context) : ReactViewGroup(context), SensorEventListener {
  var includeInactiveRegions = false
    set(value) {
      field = value
      emitIfChanged()
    }

  private var tracker: WindowInfoTrackerCallbackAdapter? = null
  private var trackedActivity: Activity? = null
  private var foldingFeature: FoldingFeature? = null
  private var hingeSensor: Sensor? = null
  private var hingeAngleDegrees: Double? = null
  private var lastPayload: String? = null

  private val layoutConsumer = Consumer<WindowLayoutInfo> { info ->
    foldingFeature = info.displayFeatures.filterIsInstance<FoldingFeature>().firstOrNull()
    emitIfChanged()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    startTracking()
  }

  override fun onDetachedFromWindow() {
    stopTracking()
    super.onDetachedFromWindow()
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    // Region frames are local to this view, so any move or resize changes them.
    emitIfChanged()
  }

  private fun startTracking() {
    val activity = findActivity() ?: return
    if (trackedActivity !== activity) {
      stopTracking()
      val adapter = WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(activity))
      adapter.addWindowLayoutInfoListener(activity, context.mainExecutor, layoutConsumer)
      tracker = adapter
      trackedActivity = activity
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val sensors = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      hingeSensor = sensors?.getDefaultSensor(Sensor.TYPE_HINGE_ANGLE)
      hingeSensor?.let { sensors?.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
    }
    emitIfChanged()
  }

  private fun stopTracking() {
    tracker?.removeWindowLayoutInfoListener(layoutConsumer)
    tracker = null
    trackedActivity = null
    (context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager)?.unregisterListener(this)
    hingeSensor = null
  }

  override fun onSensorChanged(event: SensorEvent) {
    hingeAngleDegrees = event.values.firstOrNull()?.toDouble()
    emitIfChanged()
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  private fun findActivity(): Activity? {
    (context as? ReactContext)?.currentActivity?.let { return it }
    var current: Context? = context
    while (current is ContextWrapper) {
      if (current is Activity) return current
      current = current.baseContext
    }
    return null
  }

  private fun emitIfChanged() {
    if (!isAttachedToWindow) return
    val payload = buildPayload().toString()
    if (payload == lastPayload) return
    lastPayload = payload
    val reactContext = context as? ReactContext ?: return
    val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
    UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
      ?.dispatchEvent(EnvironmentChangeEvent(surfaceId, id, payload))
  }

  private fun buildPayload(): JSONObject {
    val density = resources.displayMetrics.density
    val location = IntArray(2).also { getLocationInWindow(it) }
    val regions = JSONArray()
    foldingFeature?.let { feature ->
      val active = feature.isSeparating
      if (active || includeInactiveRegions) {
        val bounds = Rect(feature.bounds).apply { offset(-location[0], -location[1]) }
        val kind =
          if (feature.occlusionType == FoldingFeature.OcclusionType.FULL) "occlusion" else "division"
        regions.put(
          JSONObject()
            .put("id", "android-fold-$kind")
            .put("kind", kind)
            .put("frame", rect(bounds, density))
            .put("margins", insets(0f, 0f, 0f, 0f))
            .put("isActive", active)
        )
      }
    }

    val widthDp = width / density
    val heightDp = height / density
    val rootView = rootView
    val windowWidthDp = (rootView?.width ?: width) / density
    val windowHeightDp = (rootView?.height ?: height) / density
    val systemInsets =
      ViewCompat.getRootWindowInsets(this)
        ?.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
    val safeArea =
      if (systemInsets == null) insets(0f, 0f, 0f, 0f)
      else insets(
        systemInsets.top / density,
        systemInsets.right / density,
        systemInsets.bottom / density,
        systemInsets.left / density,
      )

    val hasHinge = foldingFeature != null || hingeSensor != null
    val angle = hingeAngleDegrees
    return JSONObject()
      .put("supportsDuoApis", false)
      .put("isDuo", false)
      .put("platform", "android")
      .put("horizontalSizeClass", if (windowWidthDp >= 600) "regular" else "compact")
      .put("verticalSizeClass", if (windowHeightDp >= 480) "regular" else "compact")
      .put("supportsMultipleWindows", false)
      .put(
        "geometry",
        JSONObject()
          .put("native", true)
          .put("width", widthDp.toDouble())
          .put("height", heightDp.toDouble())
          .put("safeAreaInsets", safeArea)
          .put("reservedRegions", regions)
      )
      .put(
        "hinge",
        JSONObject()
          .put("available", hasHinge)
          .put("status", hingeStatus(foldingFeature, angle, hasHinge))
          .put("angleRadians", angle?.let { Math.toRadians(it) } ?: JSONObject.NULL)
          .put("angleDegrees", angle ?: JSONObject.NULL)
      )
      .put("reservedRegions", regions)
      .put("verticalBarEdge", "unavailable")
      .put("cameras", JSONArray())
      .put(
        "window",
        JSONObject()
          .put("width", windowWidthDp.toDouble())
          .put("height", windowHeightDp.toDouble())
          .put("scale", density.toDouble())
          .put("safeAreaInsets", safeArea)
      )
  }

  private fun rect(bounds: Rect, density: Float) =
    JSONObject()
      .put("x", (bounds.left / density).toDouble())
      .put("y", (bounds.top / density).toDouble())
      .put("width", (bounds.width() / density).toDouble())
      .put("height", (bounds.height() / density).toDouble())

  private fun insets(top: Float, right: Float, bottom: Float, left: Float) =
    JSONObject()
      .put("top", top.toDouble())
      .put("right", right.toDouble())
      .put("bottom", bottom.toDouble())
      .put("left", left.toDouble())

  companion object {
    /** Maps WindowManager posture, or the hinge angle when no fold is reported, to DuoHingeStatus. */
    fun hingeStatus(feature: FoldingFeature?, angleDegrees: Double?, hasHinge: Boolean): String {
      if (feature != null) {
        return if (feature.state == FoldingFeature.State.HALF_OPENED) "partiallyOpen" else "fullyOpen"
      }
      if (!hasHinge) return "unavailable"
      // A foldable that reports no fold is usually closed and showing its outer display.
      return when {
        angleDegrees == null -> "unknown"
        angleDegrees < 15 -> "closed"
        angleDegrees < 165 -> "partiallyOpen"
        else -> "fullyOpen"
      }
    }
  }
}

private class EnvironmentChangeEvent(surfaceId: Int, viewId: Int, private val payload: String) :
  Event<EnvironmentChangeEvent>(surfaceId, viewId) {
  override fun getEventName() = "topEnvironmentChange"

  override fun getEventData() = Arguments.createMap().apply { putString("payload", payload) }
}
