# Vue 3 核心源码实现

从零实现 Vue 3 核心模块，深入理解 Vue 3 的响应式系统、运行时渲染、Diff 算法、组件化机制等核心原理。

## 📦 项目结构

项目采用 **pnpm monorepo** 架构管理多个核心包，使用 **esbuild** 进行构建，**TypeScript** 编写。

```
vue3/
├── packages/
│   ├── reactivity/          # 响应式系统
│   ├── runtime-core/        # 运行时核心（平台无关）
│   ├── runtime-dom/         # 运行时 DOM 操作
│   ├── compiler-core/       # 编译器核心（预留）
│   └── shared/              # 公共工具方法
├── scripts/
│   └── dev.js               # 开发构建脚本
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

### 包依赖关系

```
runtime-dom → runtime-core → reactivity → shared
```

## 🧩 核心模块

### reactivity — 响应式系统

实现了 Vue 3 完整的响应式核心，基于 `Proxy` 和 `Reflect` 进行依赖收集与触发更新。

| 文件 | 说明 |
|---|---|
| `reactive.ts` | `reactive()`、`toReactive()`、`isReactive()` — 基于 Proxy 的深层响应式 |
| `ref.ts` | `ref()`、`toRef()`、`toRefs()`、`proxyRefs()`、`isRef()`、`unref()` |
| `effect.ts` | `ReactiveEffect` 类、`effect()`、依赖收集 `trackEffect()`、触发更新 `triggerEffects()`，含 dirty 级别检查 |
| `reactiveEffect.ts` | `Dep` 依赖集合、依赖映射管理 |
| `computed.ts` | `computed()` — 基于 `ReactiveEffect` 的惰性计算，通过 dirty 标记实现缓存 |
| `apiWatch.ts` | `watch()`、`watchEffect()` — 支持 `deep`、`immediate`、`onCleanup` |
| `baseHandler.ts` | Proxy handler（`get`/`set` 拦截器），实现自动依赖追踪 |
| `constants.ts` | `ReactiveFlags`、`DirtyLevels` 等枚举常量 |

### runtime-core — 运行时核心

平台无关的运行时核心，实现了虚拟 DOM、渲染器、组件系统等。

| 文件 | 说明 |
|---|---|
| `vnode.ts` | `createVNode()`、`Fragment`、`Text` 符号、`isSameVNodeType()`、Block Tree（`openBlock`/`setupBlock`/`createElementBlock`） |
| `h.ts` | `h()` 函数 — 支持多种参数签名的虚拟节点创建 |
| `renderer.ts` | `createRenderer()` — 完整的渲染器实现，含 **全量 Diff 算法**（双端对比 + 最长递增子序列优化）、**Block Tree 靶向更新**、`PatchFlags` 优化 |
| `component.ts` | 组件实例创建、`setup()` 执行、Props/Attrs 分离、Slots 初始化、实例代理（`proxy`）、`emit`、`expose` |
| `apiLifecycle.ts` | 生命周期钩子：`onBeforeMount`、`onMounted`、`onBeforeUpdate`、`onUpdated`、`onBeforeUnmount`、`onUnmounted` |
| `apiInject.ts` | `provide()` / `inject()` — 基于原型链的依赖注入 |
| `scheduler.ts` | 异步调度器 `queueJob()` / `nextTick()` — 合并组件更新并支持在下一个刷新周期后执行回调 |
| `seq.ts` | 最长递增子序列算法 `getSequence()` — Diff 算法核心优化 |
| `defineAsyncComponent.ts` | `defineAsyncComponent()` — 异步组件定义 |
| `enums.ts` | `LifecycleHooks` 等枚举定义 |

#### 内置组件

| 文件 | 说明 |
|---|---|
| `components/Teleport.ts` | `<Teleport>` — 传送门组件 |
| `components/Transition.ts` | `<Transition>` — 过渡动画组件 |
| `components/KeepAlive.ts` | `<KeepAlive>` — 组件缓存，支持激活/失活生命周期 |

### runtime-dom — 运行时 DOM

针对浏览器平台的具体 DOM 操作实现。

| 文件 | 说明 |
|---|---|
| `index.ts` | `render()` 函数入口，整合节点操作与属性操作 |
| `nodeOps.ts` | DOM 节点操作封装（创建、插入、删除、查询等） |
| `patchProp.ts` | 属性更新分发 |
| `modules/class.ts` | `class` 属性处理 |
| `modules/style.ts` | `style` 属性处理 |
| `modules/event.ts` | 事件绑定处理 |
| `modules/attrs.ts` | 通用属性处理 |

### shared — 公共工具

| 文件 | 说明 |
|---|---|
| `index.ts` | `isObject`、`isFunction`、`isString`、`isNumber`、`isArray`、`hasOwn` 等类型判断工具 |
| `shapeFlags.ts` | `ShapeFlags` 位运算标志（元素、组件、子节点类型等） |
| `patchFlags.ts` | `PatchFlags` 位运算标志（靶向更新优化） |

### compiler-core — 编译器核心

> 🚧 该模块当前为预留状态，后续将实现模板编译相关功能。

## ✨ 已实现特性

- ✅ 基于 `Proxy` 的响应式系统（`reactive`、`ref`、`computed`）
- ✅ 副作用函数（`effect`）与依赖自动收集/清理
- ✅ `watch` / `watchEffect` 侦听器
- ✅ `h()` 函数与虚拟节点（VNode）创建
- ✅ 完整的渲染器与 **Diff 算法**（双端对比 + 最长递增子序列优化）
- ✅ **Block Tree** 与 `PatchFlags` 靶向更新优化
- ✅ 组件系统（`setup()`、Props、Attrs、Slots、`emit`、`expose`）
- ✅ 函数式组件与有状态组件
- ✅ 完整生命周期钩子
- ✅ `provide` / `inject` 依赖注入
- ✅ 异步调度器（批量更新）
- ✅ `nextTick()` 异步刷新时机 API
- ✅ 内置组件：`Teleport`、`Transition`、`KeepAlive`
- ✅ `defineAsyncComponent` 异步组件
- ✅ `ref` 模板引用

## 🚀 快速开始

### 环境要求

- Node.js >= 20
- pnpm

### 安装依赖

```bash
pnpm install
```

### 开发调试

```bash
# 调试 reactivity 模块
pnpm dev:reactivity

# 调试 runtime-dom 模块
pnpm dev:runtime-dom
```

构建产物会输出到对应包的 `dist/` 目录，支持 `watch` 模式实时编译。

## 🛠️ 技术栈

- **语言**: TypeScript
- **构建工具**: esbuild
- **包管理**: pnpm (workspace)
- **Node.js**: v20.19.0 (Volta)

## 📄 License

ISC
