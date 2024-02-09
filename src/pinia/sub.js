export const subscribe = (events, callback) => {
	events.push(callback);
	return function unsubscribe() {
		const index = events.indexOf(callback);
		index > -1 && events.splice(index, 1);
	}
}
export const trigger = (events, ...args) => {
	events.slice().forEach(cb => cb(...args));	
}