# simple-pinia

从零实现 `pinia`

## 简介

`pinia` 是代替 `vuex` 的状态管理库，它允许跨组件或页面共享状态。

与 `vuex` 不同的是：

- 同时支持 `Vue2` 和 `Vue3`
- 移除了 `mutation`，`action` 同时支持同步和异步方法
- 移除了 `module`，`store` 之间可以相互调用
- 支持 `TypeScript`

`store` 是一个保存数据状态和业务逻辑的实体。

`store` 由 `state`、`getter` 和 `action` 三个部分组成，相当于 `Vue` 中的 `data`、`computed` 和 `method`。

## 简单使用

1. 在 `main.js` 里使用 `pinia` 插件

```js
import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
const pinia = createPinia();

createApp(App).use(pinia).mount("#app");
```

2. 在 `store` 目录下，使用 `defineStore` 定义模块

```js
// useCounter.js
import { defineStore } from "pinia";

export const useCounterStore = defineStore("counter", {
  state: () => {
    return {
      count: 1,
    };
  },
  getters: {
    double() {
      return this.count * 2;
    },
  },
  actions: {
    increment(payload) {
      this.count += payload;
    },
  },
});
```

3. 在页面组件中使用定义好的模块

```html
<script setup>
  import { useCounterStore } from "./store/useCounter";

  const store = useCounterStore();
</script>

<template>
  <div>{{ store.count }}</div>
  <div>{{ store.double }}</div>
  <!-- 虽然这样可以实现效果，但无法监听该数据的变化 -->
  <!-- <button @click="store.count++">increment</button> -->
  <!-- 最好使用一个方法来修改数据 -->
  <button @click="store.increment(1)">increment</button>
</template>
```

## 实现原理

### createPinia

从 `pinia` 的使用方法，可以看出 `pinia` 是 `Vue` 的一个插件。

因此，返回的对象必须包含 `install` 方法。

```js
export const createPinia = () => {
  const pinia = {
    // app 为 Vue 的实例对象
    install(app) {},
  };
  return pinia;
};
```

为了用户能够通过全局属性使用 `pinia`。

```js
app.config.globalProperties.$pinia = pinia;
```

为了全局组件都能使用 `pinia`。 **根组件**作为依赖提供者，使得任何后代组件，无论层级多深，都能注入(inject)由依赖提供者提供(provide)的依赖。

```js
// 使用 symbol 保证 key 的唯一性
const PINIA_SYMBOL = Symbol();
app.provide(PINIA_SYMBOL, pinia);
```

声明响应式对象 `state`，用于存储全局状态。

```js
const state = ref({});
```

声明名为 `_store` 的 `Map`，用于存储创建过的 `store`

```js
const _store = new Map();
```

完整代码：

```js
import { ref } from "vue";
export const PINIA_SYMBOL = Symbol();
export const createPinia = () => {
  const state = ref({});
  const pinia = {
    install(app) {
      app.config.globalProperties.$pinia = pinia;
      app.provide(PINIA_SYMBOL, pinia);
    },
    state,
    _store: new Map(),
  };
  return pinia;
};
```

### defineStore

为了保证用户可以同时使用两种 `API` 来定义 `store`。

`store` 的 `id` 作为全局状态对象的 `key`，因此 `id` 不能重复。

### 以 options API 创建 store

```js
function createOptionsStore(id, options, pinia) {
  const { state, getters = {}, actions } = options;

  function setup() {
    // 将 state 状态存储到全局 state
    pinia.state.value[id] = state ? state() : {};
    // 避免解构后失去响应式
    const localState = toRefs(pinia.state.value[id]);
    const setupStore = Object.assign(
      // 将 state 转变为响应式对象
      localState,
      // 将 getters 转变为计算属性
      Object.keys(getters).reduce((computeds, gettersKey) => {
        computeds[gettersKey] = computed(() => {
          // 解决 store 未定义就使用的问题
          const store = pinia._store.get(id);
          getters[gettersKey].call(store);
        });
        return computeds;
      }, {}),
      actions
    );
    return setupStore;
  }
  const store = createSetupStore(id, setup, pinia);
  return store;
}
```

### 以 Composition API 创建 store

```js
function createSetupStore(id, setup, pinia, isComposition) {
  // 创建响应式对象
  const store = reactive(paritalStore);
  const setupStore = setup();
  // 如果直接使用 Composition API 创建，则全局状态未创建
  if (isComposition) {
    pinia.state.value[id] = {};
  }
  for (const key in setupStore) {
    const value = setupStore[key];
    if (typeof value === "function") {
      // 如果是函数，就绑定 this 指向，并传递参数
      setupStore[key] = wrapAction(value);
    } else if (isComposition) {
      // 将值(不包括计算属性)收集到全局状态中
      if (!isComputed(value)) {
        pinia.state.value[id][key] = value;
      }
    }
  }
  Object.assign(store, setupStore);
  pinia._store.set(id, store);
  return store;
}
```

### $patch

用于直接修改 `store` 中的状态，支持嵌套修改。
使用方法：可以传入 `state` 修改，也可以传入函数。
使用场景：修改有着复杂结构的数据。

```js
const isObject = (obj) => {
  return typeof obj === "object" && obj !== null;
};

function merge(target, partial) {
  for (const key in partial) {
    const targetValue = target[key];
    const partialValue = partial[key];
    if (isObject(targetValue) && isObject(partialValue) && !isRef(target)) {
      target[key] = merge(targetValue, partialValue);
    } else {
      target[key] = partialValue;
    }
  }
}

function $patch(partialStateOrMutator) {
  // 获取修改前的所有状态
  const state = pinia.state.value[id];
  if (typeof partialStateOrMutator === "function") {
    partialStateOrMutator(state);
  } else {
    merge(state, partialStateOrMutator);
  }
}
```

### $reset

能够将 `store` 还原到初始状态。 只有 `Options API` 支持，`Composition API` 无法跟踪多个 `state` 状态。

```js
store.$reset = function () {
  const newState = state ? state() : {};
  this.$patch(newState);
};
```

### $subscribe

当 `state` 发生改变时，调用回调方法。
实现原理：`Vue3` 的 `watch`，默认深度监听。

```js
function $subscribe(callback) {
  watch(pinia.state.value[id], (state) => {
    callback({ id }, state);
  });
}
```

### $onAction

设置一个回调，当 `action` 被调用时，就会被调用。
实现原理：发布订阅模式

```js
const subscribe = (events, callback) => {
  events.push(callback);
  return function unsubscribe() {
    const index = events.indexOf(callback);
    index > -1 && events.splice(index, 1);
  };
};
const trigger = (events, ...args) => {
  events.slice().forEach((cb) => cb(...args));
};
```

订阅 `action` 函数

```js
const actionEvents = [];
const $onAction = subscribe.bind(null, actionEvents);
```

触发 `action` 函数

```js
function wrapAction(action) {
  return function (...args) {
    const afterCallbacks = [];
    const onErrorCallbacks = [];
    const after = (cb) => {
      afterCallbacks.push(cb);
    };
    const onError = (cb) => {
      onErrorCallbacks.push(cb);
    };
    trigger(actionEvents, { after, onError });

    let result;
    // 如果是普通函数
    try {
      result = action.call(store, ...args);
      trigger(afterCallbacks, result);
    } catch (error) {
      trigger(onErrorCallbacks, error);
    }

    // 如果是异步函数
    if (isPromise(result)) {
      result
        .then((value) => trigger(afterCallbacks, value))
        .catch((error) => trigger(onErrorCallbacks, error));
    }

    return result;
  };
}
```

**$state**

语法糖，简化 `state` 的使用。

```js
Object.defineProperty(store, "$state", {
  get() {
    return pinia.state.value[id];
  },
  set(newState) {
    this.$patch(newState);
  },
});
```

### use

对插件的支持，扩展 `store`。

- 为 `store` 添加新的属性
- 定义 `store` 时增加新的选项
- 为 `store` 增加新的方法
- 包装现有的方法
- 改变甚至取消 `action`
- 实现副作用，如本地存储
- 仅应用插件于特定 `store`

```js
export function createPinia() {
  const _plugin = [];
  const pinia = {
    //...,
    // 使用插件，可链式调用
    use(plugin) {
      this._plugin.push(plugin);
      return this;
    },
    // 用于存储插件
    _plugin,
  };
  return pinia;
}
```

在创建 `store` 完成后，执行所有插件

```js
pinia._plugin.forEach((plugin) => plugin({ store, id }));
```

**持久化插件的实现原理**

```js
function persistPlugin() {
  return ({ store, id }) => {
    const oldState = JSON.parse(localStorage.getItem(id) || "{}");
    store.$state = oldState;
    store.$subscribe((mutation, state) => {
      localStorage.setItem(id, JSON.stringify(state));
    });
  };
}
```

### storeToRefs

功能：将 `store` 中的值都转成响应式数据(除了函数)。
原理：类似于 `toRefs`，`toRefs` 也是基于 `toRef` 实现的。

```js
export function storeToRefs(store) {
  // 获取 store 的原始值，确保不会触发 getter/setter 方法
  const raw = toRaw(store);
  const result = {};
  for (const key in raw) {
    const value = raw[key];
    if (isRef(value) || isReactive(value)) {
      result[key] = toRef(value);
    }
  }
  return result;
}
```
