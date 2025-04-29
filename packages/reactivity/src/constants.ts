export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

export enum DirtyLevels {
  // 脏值 意味着取值要运行计算属性
  Dirty = 4,
  // 不脏 用上次返回结果
  noDirty = 0
}
