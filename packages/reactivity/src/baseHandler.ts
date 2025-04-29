import { track, trigger } from './reactiveEffect'
import { isObject } from '@vue/shared'
import { reactive } from './reactive'
import { ReactiveFlags } from './constants'

export const mutableHandlers: ProxyHandler<any> = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }

    // 当取值的时候让响应式属性和effect关联起来 收集依赖
    track(target, key)

    const res = Reflect.get(target, key, receiver)
    if(isObject(res)){
      return reactive(res)
    }

    return res
  },
  set(target, key, value, receiver) {
    const oldValue = target[key]

    let result = Reflect.set(target, key, value, receiver)
    if (oldValue !== value) {
      // 触发更新
      trigger(target, key, value, oldValue)
    }
    return result
  }
}
