import { ethers } from "ethers";
import { FxTokenSymbol } from "..";

export type RewardPoolName = FxTokenSymbol | "governanceLock";
export type RewardPoolNameMap<T> = {
  [key in RewardPoolName]: T;
};

export type RewardPoolDataPool = {
  ratio: ethers.BigNumber;
  accruedAmount: ethers.BigNumber;
  deltaS: ethers.BigNumber;
};

export type RewardPoolDataPools = RewardPoolNameMap<RewardPoolDataPool>;

export type RewardPoolData = {
  pools: RewardPoolDataPools;
  forexDistributionRate: ethers.BigNumber;
  accountBalance?: ethers.BigNumber;
};

export type RewardPoolPool = {
  name: RewardPoolName;
  weight: ethers.BigNumber;
  assetType: number;
  assetAddress: string;
  totalDeposits: ethers.BigNumber;
  S: ethers.BigNumber;
};
