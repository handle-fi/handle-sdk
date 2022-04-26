import { ethers } from "ethers";

export type RewardPoolName =
  | "governanceLock"
  | "fxKeeperAUD"
  | "fxKeeperPHP"
  | "fxKeeperUSD"
  | "fxKeeperEUR";
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
  account?: {
    claimableRewards: ethers.BigNumber;
  };
};

export type RewardPoolPool = {
  name: RewardPoolName;
  weight: ethers.BigNumber;
  assetType: number;
  assetAddress: string;
  totalDeposits: ethers.BigNumber;
  S: ethers.BigNumber;
};
