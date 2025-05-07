export function isObject(value: unknown) {
  return value !== null && typeof value === 'object'
}

export function isFunction(value: unknown) {
  return typeof value === 'function'
}
