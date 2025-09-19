export function getSequence(arr: number[]) {
  const length = arr.length

  // 描述最长递增子序列的数组，元素是递增元素对应的下标
  const result = [0]
  // result 最后一个元素
  let resultLast: number

  let start: number
  let end: number
  let middle: number
  let p = arr.slice()

  for (let i = 0; i < length; i++) {
    const arrI = arr[i]

    if (arrI !== 0) {
      resultLast = result.at(-1)

      if (arrI > arr[resultLast]) {
        result.push(i)
        p[i] = resultLast
        continue
      }

      start = 0
      end = result.length - 1

      while (start < end) {
        middle = ((start + end) / 2) | 0

        if (arr[result[middle]] < arrI) {
          start = middle + 1
        } else {
          end = middle
        }
      }

      // while 循环结束后，start 和 end 会指向同一个元素
      if (arr[result[end]] > arrI) {
        result[end] = i
        p[i] = result[end - 1]
      }
    }
  }

  let i = result.length
  let last = result[i - 1]

  while (i-- > 0) {
    result[i] = last
    last = p[last]
  }

  return result
}
