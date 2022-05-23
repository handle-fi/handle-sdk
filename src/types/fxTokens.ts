import { TokenInfo } from "@uniswap/token-lists";
import { ethers } from "ethers";

export type FxTokenSymbol = "fxAUD" | "fxPHP" | "fxUSD" | "fxEUR";
export type FxTokenSymbolMap<T> = { [key in FxTokenSymbol]: T };

export type FxToken = TokenInfo & {
  price: ethers.BigNumber;
  symbol: FxTokenSymbol;
};
