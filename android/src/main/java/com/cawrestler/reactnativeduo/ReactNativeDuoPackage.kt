package com.cawrestler.reactnativeduo

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

/**
 * Android intentionally exposes no native views. The JavaScript implementation provides
 * predictable fallbacks while the iPhone Duo APIs remain iOS-only.
 */
class ReactNativeDuoViewPackage : BaseReactPackage() {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider() = ReactModuleInfoProvider { emptyMap() }
}
