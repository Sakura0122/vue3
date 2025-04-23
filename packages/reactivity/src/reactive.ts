import { isObject } from '@vue/shared'
import { mutableHandlers, ReactiveFlags } from './baseHandler'

// 记录代理后的结果 复用
const reactiveMap = new WeakMap()

function createReactiveObject(target: object) {
  if (!isObject(target)) {
    return
  }

  if (target[ReactiveFlags.IS_REACTIVE]) {
    return target
  }

  let proxy = new Proxy(target, mutableHandlers)
  if (reactiveMap.has(target)) {
    return reactiveMap.get(target)
  }
  reactiveMap.set(target, proxy)
  return proxy
}

export function reactive(target: object) {
  return createReactiveObject(target)
}

export function toReactive(value: any) {
  return isObject(value) ? reactive(value) : value
}
