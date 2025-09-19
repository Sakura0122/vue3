// 缓存当前要执行的队列
const queue = []
let isFlushing = false
const resolvePromise = Promise.resolve()

export function queueJob(job: () => void) {
  if (!queue.includes(job)) {
    queue.push(job)
  }
  if (!isFlushing) {
    isFlushing = true
    resolvePromise.then(() => {
      isFlushing = false

      const copy = queue.slice()
      queue.length = 0
      copy.forEach(job => job())
      copy.length = 0
    })
  }
}
