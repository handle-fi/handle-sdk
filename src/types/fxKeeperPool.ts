import { ethers } from "ethers";

export type FxKeeperPoolPool = {
  fxToken: string;
  totalDeposited: ethers.BigNumber;
  account?: {
    fxLocked: ethers.BigNumber;
    rewards: { collateralTypes: string[]; collateralAmounts: ethers.BigNumber[] };
  };
};
