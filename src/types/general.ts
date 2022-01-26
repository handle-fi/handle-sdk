export type Promisified<T> = {
  [K in keyof T]: Promise<T[K]>;
};

export type Token<T> = {
  symbol: T;
  address: string;
  decimals: number;
};
