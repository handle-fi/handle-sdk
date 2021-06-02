import { Token } from "./Token";
import { ethers } from "ethers";

export type CollateralToken = Token & {
  mintCollateralRatio: ethers.BigNumber,
  /** The token liquidation fee ratio */
  liquidationFee: ethers.BigNumber,
  interestRate: ethers.BigNumber,
  totalBalance: ethers.BigNumber,
  isValid: boolean
};
