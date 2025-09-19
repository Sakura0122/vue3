export function patchEvent(el, name: string, nextValue) {
  const invokers = el._vei || (el._vei = {})
  const eventName = name.slice(2).toLowerCase()

  const existingInvokers = invokers[name]
  if (nextValue && existingInvokers) {
    // 事件换绑
    return (existingInvokers.value = nextValue)
  }

  if (nextValue) {
    const invoker = (invokers[name] = createInvoker(nextValue))
    return el.addEventListener(eventName, invoker)
  }
  // 现在没有 以前有
  if (existingInvokers) {
    el.removeEventListener(name, existingInvokers)
    invokers[name] = null
  }

}

function createInvoker(value) {
  const invoker = (e) => {
    invoker.value(e)
  }
  invoker.value = value
  return invoker
}
