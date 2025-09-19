import { LifecycleHooks } from './enums'
import { currentInstance, setCurrentInstance, unSetCurrentInstance } from './component'

export const createHook = (type) => {
  return (hook, target = currentInstance) => {
    if (target) {
      // 当前钩子是在组件中运行的
      // 看当前钩子是否存放过
      const hooks = target[type] || (target[type] = [])

      const wrapHook = () => {
        setCurrentInstance(target)
        hook.call(target)
        unSetCurrentInstance()
      }

      hooks.push(wrapHook)
    }
  }
}

export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)

export const invokeArrayFns = (fns) => {
  for (let i = 0; i < fns.length; i++){
    fns[i]()
  }
}
