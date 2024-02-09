# simple-pinia

实现 pinia

## 简单使用

1. 在 `main.js` 里使用 `pinia` 插件

```js
import { createApp } from 'vue';
import App from './App.vue'
import { createPinia } from 'pinia';
const pinia = createPinia();

createApp(App)
	.use(pinia)
	.mount('#app');
```

2. 在 `store` 目录下，使用 `defineStore` 定义模块

```js
// useCounter.js
import { defineStore } from "pinia";

export const useCounterStore = defineStore('counter', {
	state: () => {
		return {
			count: 1,
		}
	},
	getters: {
		double() {
			return this.count * 2;
		}
	},
	actions: {
		increment(payload) {
			this.count += payload;
		}
	}
});
```

3. 在页面组件中使用定义好的模块

```vue
<script setup>
import { useCounterStore } from './store/useCounter';

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

### defineStore

**以 options API 创建 store**

**以 composition API 创建 store**

**$patch**

**$reset**

**$subscribe**

**$onAction**

**$state**

### use

**持久化插件的实现原理**

### storeToRefs

