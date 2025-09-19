import { isNumber, isString, PatchFlags, ShapeFlags } from '@vue/shared'
import { createVNode, Fragment, isSameVNodeType, Text } from './vnode'
import { getSequence } from './seq'
import { isRef, ReactiveEffect } from '@vue/reactivity'
import { queueJob } from './scheduler'
import { createComponentInstance, setupComponent } from './component'
import { invokeArrayFns } from './apiLifecycle'
import { isKeepAlive } from './components/KeepAlive'

export function createRenderer(renderOptions) {
  // core不关心如何渲染
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setElementText: hostSetElementText,
    setText: hostSetText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp
  } = renderOptions

  const normalize = (children) => {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        if (isString(children[i]) || isNumber(children[i])) {
          children[i] = createVNode(Text, null, String(children[i]))
        }
      }
    }
    return children
  }

  const mountChildren = (children: any[], container, anchor, parentComponent) => {
    normalize(children)
    for (let i = 0; i < children.length; i++) {
      // children[i]可能是纯文本
      patch(null, children[i], container, anchor, parentComponent)
    }
  }

  // 初始化操作
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, children, props, shapeFlag, transition } = vnode
    const el = (vnode.el = hostCreateElement(type))

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, anchor, parentComponent)
    }

    if (transition) {
      transition.beforeEnter(el)
    }

    hostInsert(el, container, anchor)

    if (transition) {
      transition.enter(el)
    }
  }

  // 对节点类型相同的元素进行处理
  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      // 直接初始化
      mountElement(n2, container, anchor, parentComponent)
    } else {
      patchElement(n1, n2, container, anchor, parentComponent)
    }
  }

  // 比较属性
  const patchProps = (oldProps, newProps, el) => {
    // 新的要全部生效
    for (const key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key])
    }

    // 删除旧的属性
    for (const key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  // 卸载儿子
  const unmountChildren = (children: any[], parentComponent) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      unmount(child, parentComponent)
    }
  }

  // 比较两个儿子的差异更新el
  const patchKeyedChildren = (c1, c2, el, parentComponent) => {
    let i = 0
    let e1 = c1.length - 1
    let e2 = c2.length - 1

    // 任意一方循环结束 终止比较
    // [a,b] -> [a,b,c]
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSameVNodeType(n1, n2)) {
        // 更新当前节点属性和儿子（递归比较）
        patch(n1, n2, el)
      } else {
        break
      }
      i++
    }

    // [a,b,c] -> [d,e,b,c]
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if (isSameVNodeType(n1, n2)) {
        // 递归比较
        patch(n1, n2, el)
      } else {
        break
      }
      e1--
      e2--
    }
    // console.log('i:', i, 'e1:', e1, 'e2:', e2)

    // 处理增加和删除的特殊情况  [c,a,b]->[a,b]
    // [a,b]->[a,b,c] i=2 e1=1 e2=2 -> (i>e1 && i<=e2)
    // [a,b]->[c,a,b] i=0 e1=-1 e2=0 -> (i>e1 && i<=e2)

    // 新的多
    if (i > e1) {
      // 有插入的部分
      if (i <= e2) {
        const nextPos = e2 + 1
        const anchor = c2[nextPos]?.el
        while (i <= e2) {
          patch(null, c2[i], el, anchor)
          i++
        }
      }
    } else if (i > e2) {
      // [a,b,c]->[a,b] i=2 e1=2 e2=1 -> (i>e2 && i<=e1)
      // [a,b,c]->[b,c] i=0 el=0 e2=-1 -> (i>e2 && i<=e1)
      if (i <= e1) {
        while (i <= e1) {
          unmount(c1[i], parentComponent)
          i++
        }
      }
    } else {
      // 以上确认不变化的节点 并对插入和移除做了处理
      // 后面就是特殊的比对方式了
      let s1 = i
      let s2 = i

      // 做一个映射表用于快速查找 看老的是否在新的里面还有 没有就删除 有就更新
      const keyToNewIndexMap = new Map()
      // 倒序插入的个数
      let toBePatched = e2 - s2 + 1

      // 变动的节点在原数组的位置
      let newIndexToOldIndexMap = new Array(toBePatched).fill(0)

      // 根据新的节点来找到对应老的位置

      for (let i = s2; i <= e2; i++) {
        const vnode = c2[i]
        keyToNewIndexMap.set(vnode.key, i)
      }

      for (let i = s1; i <= e1; i++) {
        const vnode = c1[i]
        const newIndex = keyToNewIndexMap.get(vnode.key)
        if (newIndex === undefined) {
          // 新的里面找不到老的 删除
          unmount(vnode, parentComponent)
        } else {
          // 比较前后节点的差异 更新属性和儿子
          // 为了保证0是没有比对过的元素 直接i+1
          newIndexToOldIndexMap[newIndex - s2] = i + 1
          patch(vnode, c2[newIndex], el)
        }
      }
      // 调整顺序
      // 按照新的队列倒叙插入 insertBefore 通过参照物往前面插入
      // 插入的过程中 可能新的元素多 需要创建

      const increasingSeq = getSequence(newIndexToOldIndexMap)
      let j = increasingSeq.length - 1
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 找他下一个元素作为参照物
        const newIndex = s2 + i
        const anchor = c2[newIndex + 1]?.el
        const vnode = c2[newIndex]

        // 列表中新增的元素
        if (!vnode.el) {
          patch(null, vnode, el, anchor)
        } else {
          if (i === increasingSeq[j]) {
            // diff算法优化
            j--
          } else {
            hostInsert(vnode.el, el, anchor)
          }
        }
      }
    }
  }

  // 比较儿子
  const patchChildren = (n1, n2, el, anchor, parentComponent) => {
    const c1 = n1.children
    const c2 = normalize(n2.children)

    const prevShapeFlag = n1.shapeFlag
    const shapeFlag = n2.shapeFlag

    // 子节点有三种情况 文本、数组、空
    // 1.新的是文本，老的是数组，移除老的 设置文本
    // 2.新的是文本，老的是文本，内容不相同替换
    // 3.新的是文本，老的是空，设置文本
    // 4.新的是数组，老的是数组，全量diff算法
    // 5.新的是数组，老的是文本，清空文本进行挂载
    // 6.新的是数组，老的是空，进行挂载
    // 7.新的是空，老的是数组，删除所有儿子
    // 8.新的是空，老的是文本，清空文本
    // 9.新的是空，老的是空，无需处理
    // 九种情况可简化为6种
    // 1.新的是文本，老的是数组，移除老的
    // 2.新的是文本，内容不相同替换
    // 3.老的是数组，新的是数组，全量diff算法
    // 4.老的是数组，新的是空，移除老的子节点
    // 5.老的是文本，清空文本
    // 6.老的是文本，新的是数组，挂载
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 1.新的是文本，老的是数组，移除老的
        unmountChildren(c1, parentComponent)
      }
      // 2.新的是文本，内容不相同替换
      if (c1 !== c2) {
        hostSetElementText(el, c2)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 3.两个数组比对 全量diff算法
          patchKeyedChildren(c1, c2, el, parentComponent)
        } else {
          // 4.老的是数组，新的是空，移除老的子节点
          unmountChildren(c1, parentComponent)
        }
      } else {
        // 5.老的是文本，清空文本
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, '')
        }
        // 6.老的是文本，新的是数组，挂载
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el, anchor, parentComponent)
        }
      }
    }
  }

  const patchBlockChildren = (n1, n2, el, anchor, parentComponent) => {
    for (let i = 0; i < n2.dynamicChildren.length; i++) {
      patch(n1.dynamicChildren[i], n2.dynamicChildren[i], el, anchor, parentComponent)
    }
  }

  const patchElement = (n1, n2, container, anchor, parentComponent) => {
    // 1.比较元素的差异 复用dom元素
    // 2.比较属性和元素的子节点
    const el = (n2.el = n1.el)
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    // 针对某个属性去比较
    const { patchFlag, dynamicChildren } = n2
    if (patchFlag) {
      if (patchFlag & PatchFlags.TEXT) {
        // 只要文本是动态的只比较文本
        if (n1.children !== n2.children) {
          return hostSetElementText(el, n2.children)
        }
      }
      if (patchFlag & PatchFlags.CLASS) {
      }
      if (patchFlag & PatchFlags.STYLE) {
      }
    } else {
      // 对比所有属性
      patchProps(oldProps, newProps, el)
    }

    if(dynamicChildren){
      // 线性比对
      patchBlockChildren(n1, n2, el, anchor, parentComponent)
    }else {
      // 全量diff
      patchChildren(n1, n2, el, anchor, parentComponent)
    }

  }

  const processText = (n1, n2, container) => {
    if (n1 === null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    } else {
      const el = (n2.el = n1.el)
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children)
      }
    }
  }

  const processFragment = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      mountChildren(n2.children, container, anchor, parentComponent)
    } else {
      patchChildren(n1, n2, container, anchor, parentComponent)
    }
  }

  const updateComponentPreRender = (instance, next) => {
    instance.next = null
    instance.vnode = next
    updateProps(instance, instance.props, next.props || {})
    Object.assign(instance.slots, next.children)
  }

  function renderComponent(instance) {
    const { render, vnode, proxy, attrs, slots } = instance
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      return render.call(proxy, proxy)
    } else {
      return vnode.type(attrs, { slots })
    }
  }

  function setupRenderEffect(instance, container, anchor) {
    const { render } = instance
    const componentUpdateFn = () => {
      const { bm, m } = instance
      if (!instance.isMounted) {
        // 组件挂载
        // 1.获取render函数的返回值
        // 2.将render函数的返回值作为子节点挂载到容器中
        // 3.挂载后需要更新isMounted为true
        if (bm) {
          invokeArrayFns(bm)
        }

        const subTree = renderComponent(instance)
        instance.subTree = subTree
        patch(null, subTree, container, anchor, instance)
        instance.isMounted = true

        if (m) {
          invokeArrayFns(m)
        }
      } else {
        // 组件更新

        const { next, bu, u } = instance
        if (next) {
          // 更新属性和插槽
          updateComponentPreRender(instance, next)
        }
        if (bu) {
          invokeArrayFns(bu)
        }
        const subTree = render.call(instance.proxy, instance.proxy)
        patch(instance.subTree, subTree, container, anchor, instance)
        instance.subTree = subTree

        if (u) {
          invokeArrayFns(u)
        }
      }
    }

    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update))

    const update = (instance.update = () => effect.run())
    update()
  }

  const mountComponent = (vnode, container, anchor, parentComponent) => {
    // 1.创建组件实例
    const instance = (vnode.component = createComponentInstance(vnode, parentComponent))

    if (isKeepAlive(vnode)) {
      instance.ctx.renderer = {
        // 内部创建一个div缓存dom
        createElement: hostCreateElement,
        // 之前渲染的dom放到容器中
        move(vnode, container, anchor) {
          hostInsert(vnode.component.subTree.el, container, anchor)
        },
        // 组件切换需要将现在容器中元素移除
        unmount
      }
    }

    // 2.给实例的属性赋值
    setupComponent(instance)

    // 3.创建一个effect
    setupRenderEffect(instance, container, anchor)

    // 根据propsOptions区分出props和attrs
    // 元素更新 n2.el = n1.el
    // 组件更新 n2.component.subTree.el = n1.component.subTree.el
  }

  const hasPropsChange = (oldProps, newProps) => {
    if (Object.keys(oldProps).length !== Object.keys(newProps).length) {
      return true
    }

    for (const key in newProps) {
      if (newProps[key] !== oldProps[key]) {
        return true
      }
    }

    return false
  }

  const updateProps = (instance, oldProps, newProps) => {
    if (hasPropsChange(oldProps, newProps)) {
      for (const key in newProps) {
        instance.props[key] = newProps[key]
      }
      for (const key in instance.props) {
        if (!(key in newProps)) {
          delete instance.props[key]
        }
      }
    }
  }

  const shouldComponentUpdate = (n1, n2) => {
    const { props: oldProps, children: oldChildren } = n1
    const { props: newProps, children: newChildren } = n2

    if (oldChildren || newChildren) return true

    if (oldProps === newProps) return false

    // 如果属性不一致则更新
    return hasPropsChange(oldProps, newProps)
  }

  const updateComponent = (n1, n2) => {
    const instance = (n2.component = n1.component)

    // updateProps(instance, n1.props, n2.props)

    if (shouldComponentUpdate(n1, n2)) {
      instance.next = n2
      // 如果调用update的时候有next 说明是属性、插槽更新
      instance.update()
    }
  }

  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      // 组件的渲染
      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        parentComponent.ctx.activated(n2, container, anchor)
      } else {
        mountComponent(n2, container, anchor, parentComponent)
      }
    } else {
      // 组件的更新
      updateComponent(n1, n2)
    }
  }

  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    // 两次渲染同一个节点直接跳过
    if (n1 == n2) {
      return
    }

    // 节点类型不同 直接初始化
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1, parentComponent)
      n1 = null
    }

    // 对节点类型相同的元素进行处理
    const { type, shapeFlag, ref } = n2
    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent)
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          type.process(n1, n2, container, anchor, parentComponent, {
            mountChildren,
            patchChildren,
            move(vnode, container, anchor) {
              // 将元素或者组件移动到指定位置
              hostInsert(vnode.component ? vnode.component.subTree.el : vnode.el, container, anchor)
            }
          })
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor, parentComponent)
        }
    }

    if (ref != null) {
      // 是dom 还是组件 还是组件有expose
      setRef(ref, n2)
    }

  }

  const setRef = (rawRef, vnode) => {
    const value = vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
      ? vnode.component.exposed || vnode.component.proxy
      : vnode.el
    if (isRef(rawRef)) {
      rawRef.value = value
    }
  }

  // 卸载操作
  const unmount = (vnode, parentComponent) => {
    const { shapeFlag, transition, el } = vnode
    const performRemove = () => {
      hostRemove(vnode.el)
    }
    if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
      // 需要找到对应的keep-alive走失活逻辑
      parentComponent.ctx.deactivated(vnode)
    } else if (vnode.type === Fragment) {
      unmountChildren(vnode.children, parentComponent)
    } else if (shapeFlag & ShapeFlags.COMPONENT) {
      const instance = vnode.component
      const { bum, um } = instance
      if (bum) {
        invokeArrayFns(bum)
      }

      unmount(vnode.component.subTree, parentComponent)

      if (um) {
        invokeArrayFns(um)
      }
    } else if (shapeFlag & ShapeFlags.TELEPORT) {
      vnode.type.remove(vnode, unmountChildren)
    } else {
      if (transition) {
        transition.leave(el, performRemove)
      } else {
        performRemove()
      }
    }
  }

  // 多次调用render 会进行虚拟节点的比较 再进行更新
  const render = (vnode, container) => {
    // 移除当前容器中的dom元素
    if (vnode === null) {
      if (container._vnode) {
        unmount(container._vnode, null)
      }
    } else {
      // 将虚拟节点渲染成真实dom
      patch(container._vnode || null, vnode, container)
      container._vnode = vnode
    }
  }
  return {
    render
  }
}
