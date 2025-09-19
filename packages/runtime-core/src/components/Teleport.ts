import { ShapeFlags } from '@vue/shared'

export const Teleport = {
  __isTeleport: true,
  remove(vnode, unmountChildren) {
    const { shapeFlag, children } = vnode
    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(children)
    } else {
      // 处理单个子节点的情况
      unmountChildren([children])
    }
  },
  process(n1, n2, container, anchor, parentComponent, internals) {
    let { mountChildren, patchChildren, move } = internals

    if (!n1) {
      const target = n2.target = document.querySelector(n2.props.to)
      if (target) {
        const children = Array.isArray(n2.children) ? n2.children : [n2.children]
        mountChildren(children, target, parentComponent)
      }
    } else {
      patchChildren(n1, n2, n2.target, parentComponent)
      if (n2.props.to !== n1.props.to) {
        const nextTarget = document.querySelector(n2.props.to)
        n2.children.forEach(child => {
          move(child, nextTarget, anchor)
        })
      }
    }
  }
}

export const isTeleport = value => value.__isTeleport
