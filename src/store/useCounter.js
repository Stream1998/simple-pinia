import { defineStore } from "../pinia";
// import { defineStore } from "pinia";
import { ref, computed } from 'vue';

// export const useCounterStore = defineStore('counter', () => {
// 	const count = ref(1);
// 	const double = computed(() => count.value * 2);
// 	const increment = (payload) => {
// 		count.value += payload;
// 	}
// 	return {
// 		count,
// 		double,
// 		increment,
// 	}
// });

export const useCounterStore = defineStore('counter', {
	state: () => {
		return {
			count: 1,
		}
	},
	getters:{
		double() {
			return this.count * 2;
		}
	},
	actions: {
		increment(payload) {
			this.count += payload;
		},
		asyncDecrement(payload) {
			return new Promise((resolve, reject) => {
				this.count -= 1;
				reject('错误');
			})
		}
	}
});