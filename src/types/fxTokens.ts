import { ethers } from "ethers";

export type FxTokenSymbol = "fxAUD" | "fxPHP" | "fxUSD" | "fxEUR" | "fxKRW" | "fxCNY";
export type FxTokenSymbolMap<T> = { [key in FxTokenSymbol]: T };

export type FxToken = {
  symbol: FxTokenSymbol;
  address: string;
  price: ethers.BigNumber;
  decimals: 18;
};
