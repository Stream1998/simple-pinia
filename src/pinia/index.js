import { isRef, isReactive, toRef, toRaw } from 'vue';
export { createPinia } from './createPinia';
export { defineStore } from './defineStore';

// 将 store 中的值都转成响应式数据(除了函数)
// 类似于 toRefs，toRefs 也是基于 toRef 实现的。
export function storeToRefs(store) {
	// 确保不会触发 getter/setter 方法
	const raw = toRaw(store);
	const result = {};
	for(const key in raw) {
		const value = raw[key];
		if(isRef(value) || isReactive(value)) {
			result[key] = toRef(value);
		}
	}
	return result;
}