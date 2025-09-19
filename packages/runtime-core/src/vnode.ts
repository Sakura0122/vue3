import { isFunction, isObject, isString, ShapeFlags } from '@vue/shared'
import { isTeleport } from './components/Teleport'

export const Text = Symbol('Text')
export const Fragment = Symbol('Fragment')

export function isVNode(value: any) {
  return value ? value.__v_isVNode === true : false
}

export function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

export function createVNode(type, props, children?, patchFlag?) {
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT // 元素
    : isTeleport(type)
      ? ShapeFlags.TELEPORT
      : isObject(type)
        ? ShapeFlags.STATEFUL_COMPONENT // 组件
        : isFunction(type) ? ShapeFlags.FUNCTIONAL_COMPONENT
          : 0

  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    // 虚拟节点的key
    key: props?.key,
    // 虚拟节点对应的真实dom
    el: null,
    shapeFlag,
    ref: props?.ref,
    patchFlag
  }

  if (currentBlock && patchFlag > 0) {
    currentBlock.push(vnode)
  }

  if (children) {
    if (Array.isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    } else if (isObject(children)) {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
    } else {
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    }
  }

  return vnode
}

let currentBlock = null
export const openBlock = () => {
  // 收集动态节点
  currentBlock = []
}
export const closeBlock = () => {
  currentBlock = null
}
export const setupBlock = (vnode) => {
  vnode.dynamicChildren = currentBlock
  closeBlock()
  return vnode
}

export const createElementBlock = (type, props, children, patchFlag?) => {
  const vnode = createVNode(type, props, children, patchFlag)
  return setupBlock(vnode)
}

export const toDisplayString = (value) => {
  return isString(value)
    ? value
    : value == null
      ? ''
      : isObject(value)
        ? JSON.stringify(value)
        : String(value)
}

export { createVNode as createElementVNode }
