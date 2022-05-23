import { ethers } from "ethers";

export type RewardPoolDataPool = {
  ratio: ethers.BigNumber;
  accruedAmount: ethers.BigNumber;
  deltaS: ethers.BigNumber;
};

export type RewardPoolDataPools = Record<string, RewardPoolDataPool>;

export type RewardPoolData = {
  pools: RewardPoolDataPools;
  forexDistributionRate: ethers.BigNumber;
  account?: {
    claimableRewards: ethers.BigNumber;
  };
};

export type RewardPoolPool = {
  name: string;
  weight: ethers.BigNumber;
  assetType: number;
  assetAddress: string;
  totalDeposits: ethers.BigNumber;
  S: ethers.BigNumber;
};
