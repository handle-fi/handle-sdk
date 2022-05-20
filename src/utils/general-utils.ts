import { BigNumber, ethers } from "ethers";
import { CHAIN_ID_TO_NETWORK_NAME } from "../constants";
import { Network } from "../types/network";

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

export const getNetworkFromProviderOrSigner = async (
  providerOrSigner: ethers.providers.Provider | ethers.Signer
): Promise<Network> => {
  if (providerOrSigner instanceof ethers.providers.Provider) {
    const chainId = (await providerOrSigner.getNetwork()).chainId;
    return CHAIN_ID_TO_NETWORK_NAME[chainId];
  }
  const chainId = await providerOrSigner.getChainId();
  return CHAIN_ID_TO_NETWORK_NAME[chainId];
};
