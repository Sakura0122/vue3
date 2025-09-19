import { proxyRefs, reactive } from '@vue/reactivity'
import { hasOwn, isFunction, ShapeFlags } from '@vue/shared'
import { warn } from '@vue/reactivity/src/warn'

export function createComponentInstance(vnode, parent) {
  const instance = {
    data: null,
    vnode,
    subTree: null,
    isMounted: false,
    update: null,
    props: {},
    attrs: {},
    slots: {},
    // 用户声明的哪些属性是组件的属性
    propsOptions: vnode.type.props,
    component: null,
    // 用来代理props、attrs、data
    proxy: null,
    setupState: {},
    exposed: null,
    parent,
    // 如果是keepAlive 就将dom api放到这个属性
    ctx: {} as any,
    provides: parent ? parent.provides : Object.create(null)
  }

  return instance
}

// 初始化属性
const initProps = (instance, rawProps) => {
  const props = {}
  const attrs = {}
  // 组件中定义的
  const propsOptions = instance.propsOptions || {}

  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      if (key in propsOptions) {
        props[key] = value
      } else {
        attrs[key] = value
      }
    }
  }

  instance.props = reactive(props)
  instance.attrs = attrs

}

// 初始化插槽
const initSlots = (instance, children) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children
  } else {
    instance.slots = {}
  }
}

const publicProperty = {
  $attrs: instance => instance.attrs,
  $slots: instance => instance.slots
}
const handler = {
  get(target, key) {
    const { data, props, setupState } = target
    if (data && hasOwn(data, key)) {
      return data[key]
    } else if (props && hasOwn(props, key)) {
      return props[key]
    } else if (setupState && hasOwn(setupState, key)) {
      return setupState[key]
    }
    const getter = publicProperty[key]
    if (getter) {
      return getter(target)
    }
  },
  set(target, key, value) {
    const { data, props, setupState } = target
    if (data && hasOwn(data, key)) {
      data[key] = value
    } else if (props && hasOwn(props, key)) {
      warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      )
      return false
    } else if (setupState && hasOwn(setupState, key)) {
      setupState[key] = value
    }
    return true
  }
}

export function setupComponent(instance) {
  const vnode = instance.vnode
  initProps(instance, vnode.props)
  initSlots(instance, vnode.children)

  instance.proxy = new Proxy(instance, handler)

  const { data = () => {}, render, setup } = vnode.type

  if (setup) {
    const setupContext = {
      attrs: instance.attrs,
      slots: instance.slots,
      expose(value) {
        instance.exposed = value
      },
      emit(event, ...payload) {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
        const handler = instance.vnode.props[eventName]
        handler && handler(...payload)
      }
    }
    setCurrentInstance(instance)
    const setupResult = setup(instance.props, setupContext)
    unSetCurrentInstance()
    if (isFunction(setupResult)) {
      instance.render = setupResult
    } else {
      instance.setupState = proxyRefs(setupResult)
    }
  }

  if (!isFunction(data)) {
    warn('data must be a function')
  } else {
    instance.data = reactive(data.call(instance.proxy))
  }

  if (!instance.render) {
    instance.render = render
  }
}

export let currentInstance = null
export const getCurrentInstance = () => {
  return currentInstance
}
export const setCurrentInstance = instance => {
  currentInstance = instance
}
export const unSetCurrentInstance = () => {
  currentInstance = null
}
