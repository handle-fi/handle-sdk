import { BigNumber, ethers } from "ethers";
import { gql, request } from "graphql-request";
import { HlpConfig } from "..";
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

export type Path = {
  peggedToken: string;
  fxToken: string;
  hlpToken: string;
  curveToken: string;
  pool: string;
  factory: string;
} | null;

export const getPsmToHlpToCurvePath = async (
  from: string,
  to: string,
  network: Network,
  signerOrProvider: ethers.Signer | ethers.providers.Provider
): Promise<Path> => {
  const pegs = await getTokenPegs(network);
  const validPeg = pegs.find((peg) => peg.peggedToken.toLowerCase() === from.toLowerCase());
  if (!validPeg) return null;

  const curvePool = Object.values(config.lpStaking.arbitrum).find((pool) => {
    return !!pool.factoryAddress && pool.platform === "curve";
  });
  if (!curvePool) return null;

  const metaToken = curvePool.tokensInLp.find((token) => !token.extensions?.isFxToken);
  const hlpToken = curvePool.tokensInLp.find((token) => token.extensions?.isFxToken);
  if (!metaToken || !hlpToken) return null; // this probably shouldn't happen

  const isValid = await isValidCurvePoolSwap(
    curvePool.lpToken.address,
    curvePool.factoryAddress!,
    network,
    hlpToken.address,
    to,
    signerOrProvider
  );

  return isValid
    ? {
        peggedToken: from,
        fxToken: validPeg.fxToken,
        hlpToken: hlpToken.address,
        curveToken: to,
        factory: curvePool.factoryAddress!,
        pool: curvePool.lpToken.address
      }
    : null;
};

/**
 * Combines fees and returns the total fee in basis points
 */
export const combineFees = (
  fee1: number,
  fee2: number,
  fee1Divisor = HlpConfig.BASIS_POINTS_DIVISOR,
  fee2Divisor = HlpConfig.BASIS_POINTS_DIVISOR
): number => {
  return BigNumber.from(HlpConfig.BASIS_POINTS_DIVISOR)
    .mul(fee1Divisor - fee1)
    .mul(fee2Divisor - fee2)
    .div(fee1Divisor)
    .div(fee2Divisor)
    .toNumber();
};
