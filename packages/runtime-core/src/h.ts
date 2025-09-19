import { isArray, isObject, isString, ShapeFlags } from '@vue/shared'
import { createVNode, isVNode } from './vnode'

/*
// type only
h('div')

// type + props
h('div', {})

// type + omit props + children
// Omit props does NOT support named slots
h('div', []) // array
h('div', 'foo') // text
h('div', h('br')) // vnode
h(Component, () => {}) // default slot

// type + props + children
h('div', {}, []) // array
h('div', {}, 'foo') // text
h('div', {}, h('br')) // vnode
h(Component, {}, () => {}) // default slot
h(Component, {}, {}) // named slots

// named slots without props requires explicit `null` to avoid ambiguity
h(Component, null, {})
**/


export function h(type: any, propsOrChildren?: any, children?: any) {
  let l = arguments.length

  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        // h('div', h('span'))
        return createVNode(type, null, [propsOrChildren])
      }
      // h('div', { class: 'foo' })
      return createVNode(type, propsOrChildren)
    } else {
      // h('div', [h('span'), h('span')])
      // h('div', 'sakura')
      // h('div', ['a', 'b'])
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2)
    } else if (l === 3 && isVNode(children)) {
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
}


