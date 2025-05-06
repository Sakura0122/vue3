import { ReactiveEffect } from './effect'
import { isFunction, isObject } from '@vue/shared'
import { isReactive } from './reactive'
import { isRef } from './ref'

export function watch(source, cb, options = {} as any) {
  return doWatch(source, cb, options)
}

export function watchEffect(effect, options = {} as any) {
  return doWatch(effect, null, options)
}

function traverse(source, depth?: number, currentDepth = 0, seen = new Set()) {
  if (!isObject(source)) {
    return source
  }
  if (depth) {
    if (currentDepth >= depth) {
      return source
    }
    currentDepth++
  }
  if (seen.has(source)) {
    return source
  }
  for (let sourceKey in source) {
    traverse(source[sourceKey], depth, currentDepth, seen)
  }
  return source
}

function doWatch(source, cb, { deep, immediate }) {
  const reactiveGetter = (source) => traverse(source, deep === false ? 1 : undefined)

  // 产生一个可以给ReactiveEffect来使用的getter 需要对这个对象进行取值操作 会关联当前的reactiveEffect

  let getter
  if (isReactive(source)) {
    getter = () => reactiveGetter(source)
  } else if (isRef(source)) {
    getter = () => source.value
  } else if (isFunction(source)) {
    getter = source
  }

  if (cb && deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }

  let oldValue

  let clean
  const onCleanup = (fn) => {
    clean = () => {
      fn()
      clean = null
    }
  }
  const job = () => {
    if (cb) {
      const newValue = effect.run()
      if (clean) {
        clean()
      }
      cb(newValue, oldValue, onCleanup)
      oldValue = newValue
    } else {
      effect.run()
    }
  }

  const effect = new ReactiveEffect(getter, job)

  if (cb) {
    if (immediate) {
      job()
    } else {
      oldValue = effect.run()
    }
  } else {
    effect.run()
  }

  const unwatch = () => {
    effect.stop()
  }

  return unwatch
}
