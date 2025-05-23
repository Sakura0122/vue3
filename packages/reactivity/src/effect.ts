import { DirtyLevels } from './constants'
import { Dep } from './reactiveEffect'

export function effect<T = any>(fn: () => T, options?: any) {
  // 创建一个响应式effect 数据变化后可以重新执行

  // 创建一个响应式effect 依赖的属性变化了就执行回调
  const _effect = new ReactiveEffect(fn, () => {
    _effect.run()
  })
  _effect.run()

  if (options) {
    Object.assign(_effect, options)
  }

  const runner = _effect.run.bind(_effect)
  runner.effect = _effect
  return runner
}

export let activeEffect: ReactiveEffect

function preCleanEffect(effect: ReactiveEffect) {
  effect._depsLength = 0
  // 同一个effect执行 id是相同的
  effect._trackId++
}

function postCleanEffect(effect: ReactiveEffect) {
  if (effect.deps.length > effect._depsLength) {
    for (let i = effect._depsLength; i < effect.deps.length; i++) {
      // 删除映射表中对应的effect
      cleanDepEffect(effect.deps[i], effect)
    }
    effect.deps.length = effect._depsLength
  }
}

export class ReactiveEffect<T = any> {
  // 记录当前effect执行了几次
  _trackId = 0
  _depsLength = 0
  _running = 0
  _dirtyLevel = DirtyLevels.Dirty
  deps = []
  public active = true

  /**
   *
   * @param fn 用户编写的函数
   * @param scheduler fn中依赖的数据发生变化后 重新调用run
   */
  constructor(public fn: () => T, public scheduler: (...args: any[]) => any) {
  }

  public get dirty() {
    return this._dirtyLevel === DirtyLevels.Dirty
  }

  public set dirty(value) {
    if (value) {
      this._dirtyLevel = value ? DirtyLevels.Dirty : DirtyLevels.noDirty
    }
  }

  run() {
    // 每次运行后effect变为noDirty
    this._dirtyLevel = DirtyLevels.noDirty
    // 不是激活的 执行后什么都不做
    if (!this.active) {
      return this.fn()
    }
    let lastEffect = activeEffect
    try {
      activeEffect = this
      preCleanEffect(this)
      this._running++
      return this.fn()
    } finally {
      this._running--
      postCleanEffect(this)
      activeEffect = lastEffect
    }
  }

  stop() {
    if (this.active) {
      this.active = false
      preCleanEffect(this)
      postCleanEffect(this)
    }
  }
}

function cleanDepEffect(dep: Dep, effect: ReactiveEffect) {
  dep.delete(effect)
  if (dep.size === 0) {
    dep.cleanup()
  }
}

export function trackEffect(effect: ReactiveEffect, dep: Dep) {
  // 重新收集依赖 将不需要的移除
  if (dep.get(effect) !== effect._trackId) {
    // 更新id
    dep.set(effect, effect._trackId)

    let oldDep = effect.deps[effect._depsLength]
    if (oldDep !== dep) {
      if (oldDep) {
        // 删除旧的
        cleanDepEffect(oldDep, effect)
      }
      effect.deps[effect._depsLength++] = dep
    } else {
      effect._depsLength++
    }
  }
}

export function triggerEffects(dep: Map<ReactiveEffect, number>) {
  for (const effect of dep.keys()) {

    // 当前这个值不脏 但是触发更新要将值变脏
    if (effect._dirtyLevel < DirtyLevels.Dirty) {
      effect._dirtyLevel = DirtyLevels.Dirty
    }

    if (effect.scheduler) {
      if (!effect._running) {
        effect.scheduler()
      }
    }
  }
}
