export type Token<T> = {
  symbol: T;
  address: string;
  decimals: number;
};

export type TokenExtended<T> = Token<T> & {
  name: string;
  icon: string | null;
  displayDecimals: number;
  isNative?: boolean;
};

export type StableType = "USD" | "EURO";
