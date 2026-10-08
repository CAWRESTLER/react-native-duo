package com.cawrestler.reactnativeduo

import com.cawrestler.reactnativeduo.RNDuoFoldGeometry.Insets
import org.junit.Assert.assertEquals
import org.junit.Test

class RNDuoFoldGeometryTest {
  @Test
  fun `reported folds map to open and partially open`() {
    assertEquals("fullyOpen", RNDuoFoldGeometry.hingeStatus(foldHalfOpened = false, angleDegrees = 180.0, hasHinge = true))
    assertEquals("partiallyOpen", RNDuoFoldGeometry.hingeStatus(foldHalfOpened = true, angleDegrees = 90.0, hasHinge = true))
    // WindowManager posture wins over a stale or missing sensor reading.
    assertEquals("partiallyOpen", RNDuoFoldGeometry.hingeStatus(foldHalfOpened = true, angleDegrees = null, hasHinge = true))
  }

  @Test
  fun `without a reported fold the hinge angle decides`() {
    assertEquals("closed", RNDuoFoldGeometry.hingeStatus(null, 0.0, hasHinge = true))
    assertEquals("closed", RNDuoFoldGeometry.hingeStatus(null, 14.9, hasHinge = true))
    assertEquals("partiallyOpen", RNDuoFoldGeometry.hingeStatus(null, 15.0, hasHinge = true))
    assertEquals("partiallyOpen", RNDuoFoldGeometry.hingeStatus(null, 164.9, hasHinge = true))
    assertEquals("fullyOpen", RNDuoFoldGeometry.hingeStatus(null, 165.0, hasHinge = true))
    assertEquals("unknown", RNDuoFoldGeometry.hingeStatus(null, null, hasHinge = true))
  }

  @Test
  fun `phones without a hinge stay unavailable`() {
    assertEquals("unavailable", RNDuoFoldGeometry.hingeStatus(null, null, hasHinge = false))
  }

  @Test
  fun `fold kind follows occlusion`() {
    assertEquals("occlusion", RNDuoFoldGeometry.regionKind(fullOcclusion = true))
    assertEquals("division", RNDuoFoldGeometry.regionKind(fullOcclusion = false))
  }

  @Test
  fun `fold bounds become view-local points`() {
    // A zero-width vertical fold at x = 1104 px on a 2.625 density display.
    val window = RNDuoFoldGeometry.localFrame(1104, 0, 1104, 1840, viewX = 0, viewY = 0, density = 2.625f)
    assertEquals(420.571, window.x, 0.001)
    assertEquals(0.0, window.y, 0.0)
    assertEquals(0.0, window.width, 0.0)
    assertEquals(700.952, window.height, 0.001)
    // The same fold seen from a view inset 100 px from the left and 200 px from the top.
    val nested = RNDuoFoldGeometry.localFrame(1104, 0, 1104, 1840, viewX = 100, viewY = 200, density = 2f)
    assertEquals(502.0, nested.x, 0.0)
    assertEquals(-100.0, nested.y, 0.0)
    assertEquals(920.0, nested.height, 0.0)
  }

  @Test
  fun `a full-window view gets the full system insets`() {
    val window = Insets(top = 96.0, right = 0.0, bottom = 48.0, left = 0.0)
    assertEquals(
      Insets(top = 48.0, right = 0.0, bottom = 24.0, left = 0.0),
      RNDuoFoldGeometry.localInsets(window, 0, 0, 2208, 1840, 2208, 1840, density = 2f),
    )
  }

  @Test
  fun `a nested view only gets the insets it overlaps`() {
    val window = Insets(top = 96.0, right = 0.0, bottom = 48.0, left = 0.0)
    // Below the status bar and above the navigation bar: no insets.
    assertEquals(Insets.ZERO, RNDuoFoldGeometry.localInsets(window, 0, 200, 1000, 1000, 2208, 1840, density = 2f))
    // Starting halfway into the status bar: half of it remains.
    assertEquals(24.0, RNDuoFoldGeometry.localInsets(window, 0, 48, 1000, 1000, 2208, 1840, density = 2f).top, 0.0)
    // Insets never exceed the view's own size.
    assertEquals(5.0, RNDuoFoldGeometry.localInsets(window, 0, 0, 1000, 10, 2208, 1840, density = 2f).top, 0.0)
  }

  @Test
  fun `size classes use the Android window size breakpoints`() {
    assertEquals("compact", RNDuoFoldGeometry.horizontalSizeClass(599.0))
    assertEquals("regular", RNDuoFoldGeometry.horizontalSizeClass(600.0))
    assertEquals("compact", RNDuoFoldGeometry.verticalSizeClass(479.0))
    assertEquals("regular", RNDuoFoldGeometry.verticalSizeClass(480.0))
  }
}
