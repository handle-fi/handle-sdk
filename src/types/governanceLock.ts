import { ethers } from "ethers";

export type GovernanceLockData = {
  supply: ethers.BigNumber;
  acountLocked?: {
    amount: ethers.BigNumber;
    end: ethers.BigNumber;
  };
  accountBalanceOf?: ethers.BigNumber;
};
