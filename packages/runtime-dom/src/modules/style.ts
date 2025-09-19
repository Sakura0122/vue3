export function patchStyle(el: Element, prev, next) {
  const style = (el as HTMLElement).style
  for (let key in next) {
    style[key] = next[key]
  }
  if (prev) {
    for (let key in prev) {
      if (next) {
        if (!next[key]) {
          style[key] = null
        }
      }
    }
  }
}
