import { CollateralToken } from "./CollateralToken";
import { ethers } from "ethers";

export type VaultCollateral = {
  token: CollateralToken,
  amount: ethers.BigNumber
};
