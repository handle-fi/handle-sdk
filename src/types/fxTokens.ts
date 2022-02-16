import { ethers } from "ethers";
import { Token } from "./general";

export type FxTokenSymbol = "fxAUD" | "fxPHP" | "fxUSD" | "fxEUR" | "fxKRW" | "fxCNY";
export type FxTokenSymbolMap<T> = { [key in FxTokenSymbol]: T };

export type FxToken = Token<FxTokenSymbol> & {
  price: ethers.BigNumber;
};
