import { toReactive } from './reactive'
import { activeEffect, trackEffect, triggerEffects } from './effect'
import { createDep } from './reactiveEffect'

export function ref(value: any) {
  return createRef(value)
}

function createRef(value: any) {
  return new RefImpl(value)
}

class RefImpl {
  public __v_isRef = true
  public _value: any
  public dep: any

  constructor(public rawValue: any) {
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

function trackRefValue(ref: RefImpl) {
  if (activeEffect) {
    trackEffect(activeEffect, ref.dep = createDep(() => (ref.dep = undefined), 'undefined'))
  }
}

function triggerRefValue(ref: RefImpl) {
  let dep = ref.dep
  if (dep) {
    triggerEffects(dep)
  }
}

class ObjectRefImpl {
  public __v_isRef = true

  constructor(public _object, public _key) {
  }

  get value() {
    return this._object[this._key]
  }

  set value(newValue) {
    this._object[this._key] = newValue
  }
}

export function toRef(object, key) {
  return new ObjectRefImpl(object, key)
}

export function toRefs(object) {
  const res = {}
  for (const key in object) {
    res[key] = toRef(object, key)
  }
  return res
}

export function proxyRefs(objectWithRef: any) {
  return new Proxy(objectWithRef, {
    get(target, key, receiver) {
      const value = target[key]
      return value.__v_isRef ? value.value : value
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
