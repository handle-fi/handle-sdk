import { ethers } from "ethers";

/** ERC20 token */
export type Token = {
  address: string,
  name: string,
  symbol: string,
  decimals: ethers.BigNumber
};
