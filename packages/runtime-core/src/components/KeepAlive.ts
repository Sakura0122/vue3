import { getCurrentInstance, onMounted, onUpdated } from '@vue/runtime-core'
import { ShapeFlags } from '@vue/shared'

export const KeepAlive = {
  __isKeepAlive: true,
  props: {
    max: Number
  },
  setup(props, { slots }) {
    const { max } = props
    // 用来记录哪些组件缓存过
    const keys = new Set()
    // 缓存表
    const cache = new Map()

    let pendingCacheKey = null
    const instance = getCurrentInstance()

    const { move, createElement, unmount: _unmount } = instance.ctx.renderer

    // 激活时执行
    instance.ctx.activated = (vnode, container, anchor) => {
      move(vnode, container, anchor)
    }
    // 卸载时执行
    const storageContext = createElement('div')
    instance.ctx.deactivated = (vnode) => {
      move(vnode, storageContext, null)
    }

    const cacheSubTree = () => {
      cache.set(pendingCacheKey, instance.subTree)
    }

    onMounted(cacheSubTree)
    onUpdated(cacheSubTree)

    const reset = (vnode) => {
      let shapeFlag = vnode.shapeFlag
      if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE
      }
      if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      }
      vnode.shapeFlag = shapeFlag
    }
    const unmount = (vnode) => {
      reset(vnode)
      _unmount(vnode)
    }
    const pruneCacheEntry = (key) => {
      const cached = cache.get(key)
      unmount(cached)

      cache.delete(key)
      keys.delete(key)
    }

    return () => {
      const vnode = slots.default()

      const key = vnode.key || vnode.type

      const cacheVNode = cache.get(key)
      pendingCacheKey = key
      if (cacheVNode) {
        vnode.component = cacheVNode.component
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
        keys.delete(key)
        keys.add(key)
      } else {
        keys.add(key)
        if (max && keys.size > max) {
          pruneCacheEntry(keys.keys().next().value)
        }
      }

      // 组件不需要真的卸载
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

      return vnode
    }
  }
}

export const isKeepAlive = (value) => value.type.__isKeepAlive
