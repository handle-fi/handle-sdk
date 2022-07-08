import { ethers } from "ethers";
import { gql, request } from "graphql-request";
import config from "../config";
import { CurveMetapoolFactory__factory } from "../contracts/factories/CurveMetapoolFactory__factory";
import { Network } from "../types/network";

type Peg = {
  fxToken: string;
  peggedToken: string;
};

export const getTokenPegs = async (network: Network): Promise<Peg[]> => {
  if (network !== "arbitrum") return [];
  const response = await request(
    config.theGraphEndpoints[network].hpsm,
    gql`
      query {
        pairs(first: 1000) {
          fxToken
          peggedToken
        }
      }
    `
  );
  if (response && Array.isArray(response.pairs)) {
    return response.pairs;
  }
  throw new Error(
    `Response does not contain property 'pairs' of type array. Response: ${response}`
  );
};

export const isTokenPegged = async (
  fxToken: string,
  peggedToken: string,
  network: Network
): Promise<boolean> => {
  try {
    const pegged = await getTokenPegs(network);
    return !!pegged.find(
      (peg) =>
        peg.fxToken.toLowerCase() == fxToken.toLowerCase() &&
        peg.peggedToken.toLowerCase() == peggedToken.toLowerCase()
    );
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const isValidCurvePoolSwap = async (
  poolAddress: string,
  factoryAddress: string,
  network: Network,
  tokenIn: string,
  tokenOut: string,
  signerOrProvider: ethers.Signer | ethers.providers.Provider
): Promise<boolean> => {
  if (network !== "arbitrum") return false;
  try {
    const factory = CurveMetapoolFactory__factory.connect(factoryAddress, signerOrProvider);
    // This will throw if they are not valid tokens
    await factory.get_coin_indices(poolAddress, tokenIn, tokenOut);
    return true;
  } catch (e) {
    return false;
  }
};
