import { ethers } from "ethers";
import { FxTokenSymbol } from "..";

export type FxKeeperPoolPool = {
  fxToken: FxTokenSymbol;
  totalDeposited: ethers.BigNumber;
  balance: ethers.BigNumber | undefined;
  rewards: { collateralTypes: string[]; collateralAmounts: ethers.BigNumber[] } | undefined;
};
