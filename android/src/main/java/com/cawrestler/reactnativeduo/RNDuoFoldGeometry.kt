package com.cawrestler.reactnativeduo

/**
 * Pure conversions from Android window state to the package's environment values.
 * Kept free of Android framework types so they can be unit tested on the JVM.
 */
object RNDuoFoldGeometry {
  data class Frame(val x: Double, val y: Double, val width: Double, val height: Double)

  data class Insets(val top: Double, val right: Double, val bottom: Double, val left: Double) {
    companion object {
      val ZERO = Insets(0.0, 0.0, 0.0, 0.0)
    }
  }

  /**
   * Maps WindowManager posture, or the hinge angle when no fold is reported, to DuoHingeStatus.
   *
   * @param foldHalfOpened `null` when WindowManager reports no folding feature.
   */
  fun hingeStatus(foldHalfOpened: Boolean?, angleDegrees: Double?, hasHinge: Boolean): String {
    if (foldHalfOpened != null) return if (foldHalfOpened) "partiallyOpen" else "fullyOpen"
    if (!hasHinge) return "unavailable"
    // A foldable that reports no fold is usually closed and showing its outer display.
    return when {
      angleDegrees == null -> "unknown"
      angleDegrees < 15 -> "closed"
      angleDegrees < 165 -> "partiallyOpen"
      else -> "fullyOpen"
    }
  }

  /** A fold that hides content is an occlusion region; otherwise it divides content. */
  fun regionKind(fullOcclusion: Boolean) = if (fullOcclusion) "occlusion" else "division"

  /** Converts window-pixel fold bounds to points in the coordinate space of a view at `viewX`/`viewY`. */
  fun localFrame(left: Int, top: Int, right: Int, bottom: Int, viewX: Int, viewY: Int, density: Float) =
    Frame(
      x = (left - viewX) / density.toDouble(),
      y = (top - viewY) / density.toDouble(),
      width = (right - left) / density.toDouble(),
      height = (bottom - top) / density.toDouble(),
    )

  /**
   * The part of the window's system insets that overlaps a view, in points. A view below the
   * status bar gets no top inset; a full-window view gets the full insets.
   */
  fun localInsets(
    windowInsets: Insets,
    viewX: Int,
    viewY: Int,
    viewWidth: Int,
    viewHeight: Int,
    windowWidth: Int,
    windowHeight: Int,
    density: Float,
  ): Insets {
    fun overlap(inset: Double, distanceFromEdge: Int, viewLength: Int) =
      (inset - distanceFromEdge).coerceIn(0.0, viewLength.toDouble()) / density
    return Insets(
      top = overlap(windowInsets.top, viewY, viewHeight),
      right = overlap(windowInsets.right, windowWidth - (viewX + viewWidth), viewWidth),
      bottom = overlap(windowInsets.bottom, windowHeight - (viewY + viewHeight), viewHeight),
      left = overlap(windowInsets.left, viewX, viewWidth),
    )
  }

  /** Width-based size class using the Android window size class breakpoint (600 dp). */
  fun horizontalSizeClass(windowWidthDp: Double) = if (windowWidthDp >= 600) "regular" else "compact"

  /** Height-based size class using the Android window size class breakpoint (480 dp). */
  fun verticalSizeClass(windowHeightDp: Double) = if (windowHeightDp >= 480) "regular" else "compact"
}
