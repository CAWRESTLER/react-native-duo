package com.cawrestler.reactnativeduo

import android.graphics.Color
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.ReactNativeDuoViewManagerInterface
import com.facebook.react.viewmanagers.ReactNativeDuoViewManagerDelegate

@ReactModule(name = ReactNativeDuoViewManager.NAME)
class ReactNativeDuoViewManager : SimpleViewManager<ReactNativeDuoView>(),
  ReactNativeDuoViewManagerInterface<ReactNativeDuoView> {
  private val mDelegate: ViewManagerDelegate<ReactNativeDuoView>

  init {
    mDelegate = ReactNativeDuoViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<ReactNativeDuoView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): ReactNativeDuoView {
    return ReactNativeDuoView(context)
  }

  @ReactProp(name = "color")
  override fun setColor(view: ReactNativeDuoView?, color: Int?) {
    view?.setBackgroundColor(color ?: Color.TRANSPARENT)
  }

  companion object {
    const val NAME = "ReactNativeDuoView"
  }
}
