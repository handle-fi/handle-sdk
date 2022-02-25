import { ethers } from "ethers";

export type GovernanceLockData = {
  totalForexLocked: ethers.BigNumber;
  account?: {
    forexLocked: ethers.BigNumber;
    unlocksAt: ethers.BigNumber;
    veForexBalance: ethers.BigNumber;
  };
};
