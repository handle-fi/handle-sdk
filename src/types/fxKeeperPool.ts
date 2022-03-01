import { ethers } from "ethers";
import { FxTokenSymbol } from "..";

export type FxKeeperPoolPool = {
  fxToken: FxTokenSymbol;
  totalDeposited: ethers.BigNumber;
  accountbalance: ethers.BigNumber | undefined;
  accountRewards: { collateralTypes: string[]; collateralAmounts: ethers.BigNumber[] } | undefined;
};
