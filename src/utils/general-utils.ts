import { BigNumber, ethers } from "ethers";
import { CHAIN_ID_TO_NETWORK_NAME } from "../constants";
import { Network } from "../types/network";
import {Pair} from "../types/trade";

export const getDeadline = (deadline?: number) => deadline ?? Math.floor(Date.now() / 1000) + 300;

/**
 * Adjusts a BigNumber by the difference between the current and desired decimals
 * @param value The value to transform
 * @param fromDecimals the current decimals of the number
 * @param toDecimals the desired decimals of the number
 * @returns the transformed value
 */
export const transformDecimals = (value: BigNumber, fromDecimals: number, toDecimals: number) => {
  const TEN = BigNumber.from(10);
  if (fromDecimals < toDecimals) {
    return value.mul(TEN.pow(toDecimals - fromDecimals));
  }
  if (fromDecimals > toDecimals) {
    return value.div(TEN.pow(fromDecimals - toDecimals));
  }
  return value;
};

export function mustExist<Type>(value: Type | undefined | null, name: string): Type {
  if (value == null) {
    throw new Error(`'${name}' is required`);
  }
  return value;
}

export const getNetworkFromSignerOrProvider = async (
  signerOrProvider: ethers.providers.Provider | ethers.Signer
): Promise<Network> => {
  if (signerOrProvider instanceof ethers.providers.Provider) {
    const chainId = (await signerOrProvider.getNetwork()).chainId;
    return CHAIN_ID_TO_NETWORK_NAME[chainId];
  }
  const chainId = await signerOrProvider.getChainId();
  return CHAIN_ID_TO_NETWORK_NAME[chainId];
};

export const pairFromString = (value: string): Pair => {
  const split = value.split("/");
  if (split.length !== 2)
    throw new Error("Pair is not in the format of \"BASE/QUOTE\"");
  return {
    base: split[0],
    quote: split[1]
  };
}
