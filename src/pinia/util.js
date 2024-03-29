export const isObject = (obj) => {
  return typeof obj === "object" && obj !== null;
};

export const isPromise = (obj) => {
  return obj && Promise.resolve(obj) === obj;
};
