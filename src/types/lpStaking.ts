import { ethers } from "ethers";

export type LPStakingPoolName = "sushiWethForex" | "curveEursFxEUR" | "curveHandle3";
export type LPStakingPoolNameMap<T> = { [key in LPStakingPoolName]: T };
export type LPStakingPlatformName = "handle" | "sushi" | "curve";

export type LPStakingPool = {
  name: LPStakingPoolName;
  title: string;
  platform: LPStakingPlatformName;
  totalDeposited: ethers.BigNumber;
  distributionRate: ethers.BigNumber;
  lpTokenTotalSupply: ethers.BigNumber;
  lpTokenBalances: {
    symbol: string;
    address: string;
    decimals: number;
    balance: ethers.BigNumber;
  }[];
  account?: {
    deposited: ethers.BigNumber;
    claimableRewards: ethers.BigNumber;
  };
};
