import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from './pinia'
const pinia = createPinia();

// pinia 持久化插件
function persistPlugin() {
	return ({ store, id }) => {
		// const oldState = store.$state;
		const oldState = JSON.parse(localStorage.getItem(id) || '{}');
		store.$state = oldState;
		store.$subscribe((mutation, state) => {
			localStorage.setItem(id, JSON.stringify(state));			
		})
	}
}

pinia.use(persistPlugin());
createApp(App).use(pinia).mount('#app');
