<script setup>
import { useCounterStore } from './store/useCounter';
import { storeToRefs } from './pinia';

const store = useCounterStore();
const { count, double }= storeToRefs(store);
console.log(count, double)

// 支持批量修改数据 
const patch = () => {
  store.$patch({count: 2});
  // store.$patch((state) => {
  //   state.count++;
  //   state.count++;
  // })
}

store.$subscribe((mutation, state) => {
  console.log('subscribe', mutation,state)
})

store.$onAction(({after, onError}) => {
  after(() => {
    console.log(count);
  })
  onError((err) => {
    console.log(err);
  })
})

</script>

<template>
  <div>{{ count }}</div>
  <div>{{ double }}</div>
  
  <button @click="store.increment(1)">increment</button>
  <button @click="store.asyncDecrement(1)">async decrement</button>
  <button @click="patch">patch</button>
  <!-- store.$reset 方法只支持 Options API -->
  <button @click="store.$reset()">reset(Options API)</button>
</template>


