import { piniaSymbol } from './constant';
import { ref } from 'vue';

export function createPinia () {
	const state = ref({});
	const _plugin = [];
	const pinia = {
		install(app) {
			// 设置全局属性
			app.config.globalProperties.$pinia = pinia;

			// 使用 inject 注入
			app.provide(piniaSymbol, pinia);
		},
		// 使用插件，可链式调用
		use(plugin) {
			this._plugin.push(plugin);
			return this;
		},
		// 用于存储全局的 `state` 状态
		state,
		// 用于存储全局的 `store` 模块
		_store: new Map(),
		// 用于存储插件
		_plugin,

	}
	return pinia;
}