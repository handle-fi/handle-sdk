import { ethers } from "ethers";
import { FxTokenSymbol } from "..";

export type FxKeeperPoolPool = {
  fxToken: FxTokenSymbol;
  totalDeposited: ethers.BigNumber;
  account?: {
    fxLocked: ethers.BigNumber;
    rewards: { collateralTypes: string[]; collateralAmounts: ethers.BigNumber[] };
  };
};
