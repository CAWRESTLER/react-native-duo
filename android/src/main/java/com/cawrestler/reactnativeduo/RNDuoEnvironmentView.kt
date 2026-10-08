package com.cawrestler.reactnativeduo

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.view.ViewTreeObserver
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
 * `DuoProvider` and `DuoGeometryView` both use it; region frames and safe-area insets are
 * local to this view, so a nested geometry view sees the fold in its own coordinates.
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

  // An ancestor can scroll or move this view without relaying it out, which still changes
  // its local region frames. The payload comparison makes these callbacks cheap.
  private val globalLayoutListener = ViewTreeObserver.OnGlobalLayoutListener { emitIfChanged() }
  private val scrollListener = ViewTreeObserver.OnScrollChangedListener { emitIfChanged() }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    viewTreeObserver.addOnGlobalLayoutListener(globalLayoutListener)
    viewTreeObserver.addOnScrollChangedListener(scrollListener)
    startTracking()
  }

  override fun onDetachedFromWindow() {
    viewTreeObserver.removeOnGlobalLayoutListener(globalLayoutListener)
    viewTreeObserver.removeOnScrollChangedListener(scrollListener)
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
        val bounds = feature.bounds
        val kind = RNDuoFoldGeometry.regionKind(feature.occlusionType == FoldingFeature.OcclusionType.FULL)
        regions.put(
          JSONObject()
            .put("id", "android-fold-$kind")
            .put("kind", kind)
            .put(
              "frame",
              frame(
                RNDuoFoldGeometry.localFrame(
                  bounds.left, bounds.top, bounds.right, bounds.bottom, location[0], location[1], density
                )
              )
            )
            .put("margins", insets(RNDuoFoldGeometry.Insets.ZERO))
            .put("isActive", active)
        )
      }
    }

    val root = rootView ?: this
    val windowWidthDp = root.width / density.toDouble()
    val windowHeightDp = root.height / density.toDouble()
    val windowInsets =
      ViewCompat.getRootWindowInsets(this)
        ?.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
        ?.let { RNDuoFoldGeometry.Insets(it.top.toDouble(), it.right.toDouble(), it.bottom.toDouble(), it.left.toDouble()) }
        ?: RNDuoFoldGeometry.Insets.ZERO
    val rootLocation = IntArray(2).also { root.getLocationInWindow(it) }
    val viewSafeArea =
      RNDuoFoldGeometry.localInsets(
        windowInsets, location[0], location[1], width, height, root.width, root.height, density
      )
    val windowSafeArea =
      RNDuoFoldGeometry.localInsets(
        windowInsets, rootLocation[0], rootLocation[1], root.width, root.height, root.width, root.height, density
      )

    val hasHinge = foldingFeature != null || hingeSensor != null
    val angle = hingeAngleDegrees
    val foldHalfOpened = foldingFeature?.let { it.state == FoldingFeature.State.HALF_OPENED }
    return JSONObject()
      .put("supportsDuoApis", false)
      .put("isDuo", false)
      .put("platform", "android")
      .put("horizontalSizeClass", RNDuoFoldGeometry.horizontalSizeClass(windowWidthDp))
      .put("verticalSizeClass", RNDuoFoldGeometry.verticalSizeClass(windowHeightDp))
      .put("supportsMultipleWindows", false)
      .put(
        "geometry",
        JSONObject()
          .put("native", true)
          .put("width", width / density.toDouble())
          .put("height", height / density.toDouble())
          .put("safeAreaInsets", insets(viewSafeArea))
          .put("reservedRegions", regions)
      )
      .put(
        "hinge",
        JSONObject()
          .put("available", hasHinge)
          .put("status", RNDuoFoldGeometry.hingeStatus(foldHalfOpened, angle, hasHinge))
          .put("angleRadians", angle?.let { Math.toRadians(it) } ?: JSONObject.NULL)
          .put("angleDegrees", angle ?: JSONObject.NULL)
      )
      .put("reservedRegions", regions)
      .put("verticalBarEdge", "unavailable")
      .put("cameras", JSONArray())
      .put(
        "window",
        JSONObject()
          .put("width", windowWidthDp)
          .put("height", windowHeightDp)
          .put("scale", density.toDouble())
          .put("safeAreaInsets", insets(windowSafeArea))
      )
  }

  private fun frame(frame: RNDuoFoldGeometry.Frame) =
    JSONObject()
      .put("x", frame.x)
      .put("y", frame.y)
      .put("width", frame.width)
      .put("height", frame.height)

  private fun insets(insets: RNDuoFoldGeometry.Insets) =
    JSONObject()
      .put("top", insets.top)
      .put("right", insets.right)
      .put("bottom", insets.bottom)
      .put("left", insets.left)
}

private class EnvironmentChangeEvent(surfaceId: Int, viewId: Int, private val payload: String) :
  Event<EnvironmentChangeEvent>(surfaceId, viewId) {
  override fun getEventName() = "topEnvironmentChange"

  override fun getEventData() = Arguments.createMap().apply { putString("payload", payload) }
}
