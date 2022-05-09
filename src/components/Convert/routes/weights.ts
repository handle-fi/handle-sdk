import { ethers, Signer } from "ethers";
import { Network } from "../../..";
import { HlpToken } from "../../../config/hlp";

export const PSM_WEIGHT = 100;
export const ONE_INCH_WEIGHT = 5;
export const ZERO_X_WEIGHT = 5;
export const HLP_WEIGHT = 100;

export type WeightInput = {
  fromToken: Omit<HlpToken, "name">;
  toToken: Omit<HlpToken, "name">;
  provider?: ethers.providers.Provider | Signer;
  network: Network;
};
