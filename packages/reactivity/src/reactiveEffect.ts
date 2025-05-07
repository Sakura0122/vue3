import { activeEffect, ReactiveEffect, trackEffect, triggerEffects } from './effect'

const targetMap = new WeakMap()

export type Dep = Map<ReactiveEffect, number> & {
  cleanup: () => void
  name: string | symbol
}

export const createDep = (cleanup: () => void, key: string | symbol) => {
  const dep = new Map() as Dep
  dep.cleanup = cleanup
  dep.name = key
  return dep
}

export function track(target: object, key: string | symbol) {
  // activeEffect 有这个属性说明这个key是在effect中访问的 没有的话就不需要收集依赖了
  if (activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)

    if (!dep) {
      depsMap.set(key, dep = createDep(() => depsMap.delete(key), key))
    }
    // 将当前effect放入dep中 后续可根据值的变化触发此dep中存放的effect
    trackEffect(activeEffect, dep)
  }
}

export function trigger(target: object, key: string | symbol, newValue: any, oldValue: any) {
  const depsMap = targetMap.get(target)
  if(!depsMap) return
  const dep = depsMap.get(key)
  if(dep){
    triggerEffects(dep)
  }
}
