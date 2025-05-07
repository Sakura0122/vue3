import { toReactive } from './reactive'
import { activeEffect, trackEffect, triggerEffects } from './effect'
import { createDep, Dep } from './reactiveEffect'

export function ref<T>(value: T) {
  return createRef(value)
}

function createRef(value: any) {
  return new RefImpl(value)
}

class RefImpl<T> {
  public __v_isRef = true
  public _value: T
  public dep?: Dep = undefined

  constructor(public rawValue: T) {
    this._value = toReactive(rawValue)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    if (newValue !== this.rawValue) {
      this.rawValue = newValue
      this._value = newValue
      triggerRefValue(this)
    }
  }
}

type RefBase<T> = {
  dep?: Dep
  value: T
}

export function trackRefValue(ref: RefBase<any>) {
  if (activeEffect) {
    trackEffect(activeEffect, ref.dep = ref.dep || createDep(() => (ref.dep = undefined), 'undefined'))
  }
}

export function triggerRefValue(ref: RefBase<any>) {
  let dep = ref.dep
  if (dep) {
    triggerEffects(dep)
  }
}

class ObjectRefImpl<T extends object, K extends keyof T> {
  public __v_isRef = true

  constructor(public _object: T, public _key: K) {
  }

  get value() {
    return this._object[this._key]
  }

  set value(newValue) {
    this._object[this._key] = newValue
  }
}

export function toRef<T extends object, K extends keyof T>(object: T, key: K) {
  return new ObjectRefImpl(object, key)
}

export function toRefs<T extends object>(object: T) {
  const res: any = {}
  for (const key in object) {
    res[key] = toRef(object, key)
  }
  return res
}

export function proxyRefs(objectWithRef: any) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      return unref(Reflect.get(target, key, receiver))
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      if (oldValue.__v_isRef) {
        oldValue.value = value
        return true
      }
      return Reflect.set(target, key, value, receiver)
    }
  })
}

export function isRef(value: any) {
  return !!(value && value.__v_isRef)
}

export function unref<T>(ref: any): T {
  return isRef(ref) ? ref.value : ref
}
