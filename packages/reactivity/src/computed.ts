import { isFunction } from '@vue/shared'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'
import { Dep } from './reactiveEffect'

export type ComputedGetter<T> = (oldValue?: T) => T
export type ComputedSetter<T> = (newValue: T) => void

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}

export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>) {
  const isGetter = isFunction(getterOrOptions)
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>
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

class ComputedRefImpl<T> {
  public _value!: T
  public effect: ReactiveEffect<T>
  public dep?: Dep = undefined

  constructor(getter: ComputedGetter<T>, public setter: ComputedSetter<T>) {
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
