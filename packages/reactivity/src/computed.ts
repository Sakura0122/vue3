import { isFunction } from '@vue/shared'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'

export function computed(getterOrOptions) {
  const isGetter = isFunction(getterOrOptions)
  let getter
  let setter
  if (isGetter) {
    getter = getterOrOptions
    setter = () => {
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  return new ComputedRefImpl(getter, setter)
}

class ComputedRefImpl {
  public _value
  public effect
  public dep

  constructor(getter, public setter) {
    // 创建一个effect来管理当前计算属性的dirty
    this.effect = new ReactiveEffect(() => getter(this._value), () => {
      // 计算属性依赖的值变化了 应该重新触发渲染
      triggerRefValue(this)
    })
  }

  get value() {
    if (this.effect.dirty) {
      this._value = this.effect.run()
      trackRefValue(this)
    }
    return this._value
  }

  set value(newValue) {
    this.setter(newValue)
  }
}
