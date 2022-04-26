import { ethers } from "ethers";
import { Token } from "./tokens";

export type FxTokenSymbol = "fxAUD" | "fxPHP" | "fxUSD" | "fxEUR";
export type FxTokenSymbolMap<T> = { [key in FxTokenSymbol]: T };

export type FxToken = Token<FxTokenSymbol> & {
  price: ethers.BigNumber;
};
