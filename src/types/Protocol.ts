import { fxToken } from "./fxToken";
import { ethers } from "ethers";
import { CollateralToken } from "./CollateralToken";

/** Holds protocol data */
export type Protocol = {
  fxTokens: fxToken[],
  collateralTokens: CollateralToken[],
  feeRecipient: string,
  fees: {
    /** Mint fee ratio per 1,000 */
    mint: ethers.BigNumber,
    /** Burn fee ratio per 1,000 */
    burn: ethers.BigNumber,
    /** Withdraw fee ratio per 1,000 */
    withdraw: ethers.BigNumber,
    /** Deposit fee ratio per 1,000 */
    deposit: ethers.BigNumber
  }
};
