import { ethers } from "ethers";

export type CollateralSymbol = "FOREX" | "WETH";
export type CollateralSymbolWithNative = CollateralSymbol | "ETH";
export type CollateralSymbolMap<T> = { [key in CollateralSymbol]: T };

export type Collateral = {
  symbol: CollateralSymbol;
  address: string;
  decimals: number;
  mintCR: ethers.BigNumber;
  liquidationFee: ethers.BigNumber;
  interestRate: ethers.BigNumber;
  price: ethers.BigNumber;
};
