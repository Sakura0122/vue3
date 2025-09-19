// 对节点元素的属性操作
import { patchClass } from './modules/class'
import { patchStyle } from './modules/style'
import { patchEvent } from './modules/event'
import { patchAttr } from './modules/attrs'

export const patchProp = (el, key, prevValue, nextValue) => {
  if (key === 'class') {
    // 类
    return patchClass(el, nextValue)
  } else if (key === 'style') {
    // 样式
    return patchStyle(el, prevValue, nextValue)
  } else if (/^on[^a-z]/.test(key)) {
    // 事件
    return patchEvent(el, key, nextValue)
  } else {
    // 其他属性
    return patchAttr(el,key, nextValue)
  }
}
