package com.cawrestler.reactnativeduo

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.RNDuoEnvironmentViewManagerDelegate
import com.facebook.react.viewmanagers.RNDuoEnvironmentViewManagerInterface

@ReactModule(name = RNDuoEnvironmentViewManager.NAME)
class RNDuoEnvironmentViewManager :
  ViewGroupManager<RNDuoEnvironmentView>(),
  RNDuoEnvironmentViewManagerInterface<RNDuoEnvironmentView> {
  private val delegate = RNDuoEnvironmentViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<RNDuoEnvironmentView> = delegate

  override fun getName() = NAME

  override fun createViewInstance(context: ThemedReactContext) = RNDuoEnvironmentView(context)

  // The annotation registers the setter with React Native's legacy property updater too, which
  // otherwise logs "Could not find generated setter"; Fabric still routes props through the delegate.
  @ReactProp(name = "includeInactiveRegions")
  override fun setIncludeInactiveRegions(view: RNDuoEnvironmentView, value: Boolean) {
    view.includeInactiveRegions = value
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf("topEnvironmentChange" to mapOf("registrationName" to "onEnvironmentChange"))

  companion object {
    const val NAME = "RNDuoEnvironmentView"
  }
}
