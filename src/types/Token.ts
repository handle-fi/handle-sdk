import { ethers } from "ethers";

/** ERC20 token with relevant protocol properties */
export type Token = {
  address: string,
  name: string,
  symbol: string,
  decimals: ethers.BigNumber,
  /** Token rate in ETH */
  rate: ethers.BigNumber,
  /** Whether the token can be used in the protocol */
  isValid: boolean
};
