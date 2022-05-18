import { TokenInfo } from "@uniswap/token-lists";
import { ethers } from "ethers";

export type FxTokenSymbol = "fxAUD" | "fxPHP" | "fxUSD" | "fxEUR";
export type FxTokenSymbolMap<T> = { [key in FxTokenSymbol]: T };

export type FxToken = TokenInfo & {
  symbol: FxTokenSymbol;
};

export type FxTokenPriced = FxToken & {
  price: ethers.BigNumber;
};
