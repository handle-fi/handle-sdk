import { ethers } from "ethers";

/** ERC20 token */
export type Token = {
  name: string;
  symbol: string;
  decimals: ethers.BigNumber;
};
