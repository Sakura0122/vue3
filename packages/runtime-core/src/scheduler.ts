// 缓存当前要执行的队列
const queue = []
let isFlushing = false
const resolvePromise = Promise.resolve()
let currentFlushPromise: Promise<void> | null = null

function flushJobs() {
  isFlushing = false

  const copy = queue.slice()
  queue.length = 0
  copy.forEach(job => job())
  copy.length = 0
  currentFlushPromise = null
}

export function queueJob(job: () => void) {
  if (!queue.includes(job)) {
    queue.push(job)
  }
  if (!isFlushing) {
    isFlushing = true
    currentFlushPromise = resolvePromise.then(flushJobs)
  }
}

export function nextTick<T = void>(fn?: () => T | Promise<T>): Promise<T | void> {
  const p = currentFlushPromise || resolvePromise
  return fn ? p.then(fn) : p
}
