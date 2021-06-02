import { Token } from "./Token";
import { ethers } from "ethers";

export type fxToken = Token & {
  rewardRatio: ethers.BigNumber;
  isValid: boolean;
};
