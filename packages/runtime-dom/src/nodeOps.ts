// 对节点元素的增删改查
export const nodeOps = {
  insert: (child: Node, parent: Element, anchor?: any) => parent.insertBefore(child, anchor || null),
  remove: (child: Node) => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  createElement: (tagName: string) => document.createElement(tagName),
  createText: (text: string) => document.createTextNode(text),
  setElementText: (node: Element, text: string) => node.textContent = text,
  setText: (node: Node, text: string) => node.nodeValue = text,
  parentNode: (node: Node) => node.parentNode as Element | null,
  nextSibling: (node: Node) => node.nextSibling
}
