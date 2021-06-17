import { Token } from "./Token";
import { ethers } from "ethers";

export type fxToken = Token & {
  totalSupply: ethers.BigNumber;
  isValid: boolean;
};
