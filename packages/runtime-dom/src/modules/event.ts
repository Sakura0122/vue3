export function patchEvent(el, name: string, nextValue) {
  const invokers = el._vei || (el._vei = {})
  const eventName = name.slice(2).toLowerCase()

  const existingInvoker = invokers[name]
  if (nextValue && existingInvoker) {
    // 事件换绑
    existingInvoker.value = nextValue
    return
  }

  if (nextValue) {
    const invoker = (invokers[name] = createInvoker(nextValue))
    el.addEventListener(eventName, invoker)
    return
  }
  // 现在没有 以前有
  if (existingInvoker) {
    el.removeEventListener(eventName, existingInvoker)
    delete invokers[name]
  }
}

function createInvoker(value) {
  const invoker = (e) => {
    invoker.value(e)
  }
  invoker.value = value
  return invoker
}
