export type Pair = {
  baseSymbol: string;
  quoteSymbol: string;
};

export type WebsocketPrice = {
  pair: Pair;
  value: number;
  timestamp: number;
};
