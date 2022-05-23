import { TokenInfo } from "@uniswap/token-lists";
import { ethers } from "ethers";

export type FxTokenSymbolMap<T> = { [key in string]: T };

export type FxToken = TokenInfo & {
  price: ethers.BigNumber;
  symbol: string;
};
