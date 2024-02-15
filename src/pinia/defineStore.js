import { computed, getCurrentInstance, reactive, inject, toRefs, isRef, watch } from 'vue';
import { piniaSymbol } from './constant';
import { isObject } from './util';
import { subscribe, trigger } from './sub';

// 判断是否为计算属性
function isComputed(value) {
	return isRef(value) && value.effect;
}

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
					const store = pinia._store.get(id);
					getters[gettersKey].call(store)
				});
				return computeds;
			}, {}),
			actions,
		);
		return setupStore;
	}
	const store = createSetupStore(id, setup, pinia);

	store.$reset = function() {
		const newState = state ? state() : {};
		this.$patch(newState);
	}
	return store;
}

function createSetupStore(id, setup, pinia, isComposition) {
	function merge (target, partial){
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
		if (typeof partialStateOrMutator === 'function') {
			partialStateOrMutator(state);
		} else {
			merge(state, partialStateOrMutator);
		}
	}
	function $subscribe(callback) {
		watch(pinia.state.value[id], state => {
			callback({id}, state);	
		})	
	}
	const actionEvents = [];
	const paritalStore = {
		$patch,
		$subscribe,
		$onAction: subscribe.bind(null, actionEvents),
	}
	// 创建响应式对象
	const store = reactive(paritalStore);
	function wrapAction(action) {
		return function (...args) {
			const afterCallbacks = [];
			const onErrorCallbacks = [];
			const after = (cb) => {
				afterCallbacks.push(cb);
			}
			const onError = (cb) => {
				onErrorCallbacks.push(cb);
			}
			trigger(actionEvents, {after, onError});

			let result;
			// 如果是普通函数
			try {
				result = action.call(store, ...args);
				trigger(afterCallbacks, result);
			} catch (error) {
				trigger(onErrorCallbacks, error);	
			}

			// 如果是异步函数
			if(result instanceof Promise) {
				result
					.then(value => trigger(afterCallbacks, value))
					.catch(error => trigger(onErrorCallbacks, error));
			}

			return result;
		}
	}
	const setupStore = setup();
	// 如果直接使用 Composition API 创建，则全局状态未创建
	if (isComposition) {
		pinia.state.value[id] = {};
	}
	for (const key in setupStore) {
		const value = setupStore[key];
		if (typeof value === 'function') { // 如果是函数，就绑定 this 指向，并传递参数
			setupStore[key] = wrapAction(value);
		} else if(isComposition){ // 将值(不包括计算属性)收集到全局状态中
			if(!isComputed(value)){
				pinia.state.value[id][key] = value;
			}
		}
	}
	Object.assign(store, setupStore);
	Object.defineProperty(store, '$state', {
		get() {
			return pinia.state.value[id];
		},
		set(newState) {
			this.$patch(newState);
		}
	})
	// 执行所有插件
	pinia._plugin.forEach(plugin => plugin({store, id}));
	pinia._store.set(id, store);
	return store;
}

export function defineStore(idOrOptions, setup) {
	// 兼容两种写法
	// 只有一个参数(options) / 两个参数(id, setup)
	let id, options;
	if(typeof idOrOptions === 'string') {
		id = idOrOptions;
		options = setup;
	} else {
		options = idOrOptions;
		id = idOrOptions.id;
	}

	// 是否为 Composition API 写法
	const isComposition = typeof setup === 'function';

	function useStore() {
		const instance = getCurrentInstance();
		const pinia = instance && inject(piniaSymbol);
		
		// debugger;
		if(!pinia._store.has(id)) {
			if(isComposition) {
				createSetupStore(id, setup, pinia, isComposition);
			} else {
				createOptionsStore(id, options, pinia);
			}
		}
		const store = pinia._store.get(id);
		return store;
	}
	return useStore;
}