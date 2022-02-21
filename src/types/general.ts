export type Promisified<T> = {
  [K in keyof T]: Promise<T[K]>;
};
