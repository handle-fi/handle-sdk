import { BigNumber, ethers } from "ethers";
import { gql, request } from "graphql-request";
import { HlpConfig } from "..";
import config, { LPStakingPoolDetails } from "../config";
import { CURVE_FEE_DENOMINATOR } from "../constants";
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
  } catch (e: any) {
    if (!(typeof e?.message === "string") || !e?.message?.includes("No available market")) {
      throw e;
    }
    return false;
  }
};

const curvePoolCache: Record<string, LPStakingPoolDetails | null> = {};

/**
 * @returns a curve lp with this address as one of the tokens, or underlying tokens
 */
const findCurvePoolForHlpTokenSwap = async (
  to: string,
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
  network: string
): Promise<LPStakingPoolDetails | undefined> => {
  if (network !== "arbitrum") return;

  const curvePools = Object.values(config.lpStaking[network]).filter(
    (pool) => pool.platform === "curve"
  );
  for (let pool of curvePools) {
    if (!pool.factoryAddress) {
      // this should not happen
      console.error("No factory for curve pool");
      continue;
    }
    if (!pool.tokensInLp.some((token) => token.extensions?.isFxToken)) {
      // this also should not happen, as curve pools should have at least one fxtoken
      continue;
    }
    const factory = CurveMetapoolFactory__factory.connect(pool.factoryAddress, signerOrProvider);
    const baseTokens = factory.get_coins(pool.lpToken.address);
    const underlyingTokens = new Promise<string[]>(async (resolve) => {
      try {
        resolve(await factory.get_underlying_coins(pool.lpToken.address));
      } catch {
        // underlying coins reverts if token is not a metapool, meaning there are
        // no underlying tokens
        resolve([]);
      }
    });
    const tokens = (await Promise.all([baseTokens, underlyingTokens])).flat();
    if (tokens.some((token) => token.toLowerCase() === to.toLowerCase())) {
      return pool;
    }
  }

  const promises: Promise<LPStakingPoolDetails | null>[] = curvePools.map(
    (pool) =>
      new Promise(async (resolve) => {
        if (!pool.factoryAddress) {
          // this should not happen
          console.error("No factory for curve pool");
          return resolve(null);
        }
        if (!pool.tokensInLp.some((token) => token.extensions?.isFxToken)) {
          // this also should not happen, as curve pools should have at least one fxtoken
          return resolve(null);
        }
        const factory = CurveMetapoolFactory__factory.connect(
          pool.factoryAddress,
          signerOrProvider
        );
        const baseTokens = factory.get_coins(pool.lpToken.address);
        const underlyingTokens = new Promise<string[]>(async (resolveTokens) => {
          try {
            resolveTokens(await factory.get_underlying_coins(pool.lpToken.address));
          } catch {
            // underlying coins reverts if token is not a metapool, meaning there are
            // no underlying tokens
            resolveTokens([]);
          }
        });
        const tokens = (await Promise.all([baseTokens, underlyingTokens])).flat();
        if (tokens.some((token) => token.toLowerCase() === to.toLowerCase())) {
          return resolve(pool);
        }
        return resolve(null);
      })
  );
  return (await Promise.all(promises)).find((value) => value !== null) ?? undefined;
};

// The same as the findCurvePoolForHlpTokenSwap, but with a cache first approach
export const findCachedCurvePoolForHlpTokenSwap = async (
  to: string,
  signerOrProvider: ethers.Signer | ethers.providers.Provider,
  network: string
) => {
  const key = `${to.toLowerCase()}${network}`;
  if (curvePoolCache[key] !== undefined) return curvePoolCache[key];
  curvePoolCache[key] = (await findCurvePoolForHlpTokenSwap(to, signerOrProvider, network)) ?? null;
  return curvePoolCache[key];
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
  const [validPeg, curvePool] = await Promise.all([
    pegs.find((peg) => peg.peggedToken.toLowerCase() === from.toLowerCase()),
    findCachedCurvePoolForHlpTokenSwap(to, signerOrProvider, network)
  ]);

  if (!validPeg || !curvePool) return null;

  const hlpToken = curvePool.tokensInLp.find((token) => token.extensions?.isFxToken);
  if (!hlpToken) return null; // this won't happen, so long as the curve pool has a fxToken

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
 * Combines fees and returns the total fee in basis points.
 * @note this only works if the fees are compounded on the same amount,
 * e.g amount -> fee collected -> fee collected again.
 */
export const combineFees = (
  fee1: number,
  fee2: number,
  fee1Divisor = HlpConfig.BASIS_POINTS_DIVISOR,
  fee2Divisor = HlpConfig.BASIS_POINTS_DIVISOR
): number => {
  const decimalFee = 1 - (1 - fee1 / fee1Divisor) * (1 - fee2 / fee2Divisor);
  return Math.floor(decimalFee * HlpConfig.BASIS_POINTS_DIVISOR);
};

export const curveFeeToBasisPoints = (num: number) => {
  return (num / CURVE_FEE_DENOMINATOR) * HlpConfig.BASIS_POINTS_DIVISOR;
};

/**
 * @param slippage refers to the percentage (e.g. 0.5 is 0.5% slippage)
 */
export const getMinOut = (amount: BigNumber, slippage: number) => {
  return amount
    .mul((1 - slippage / 100) * HlpConfig.BASIS_POINTS_DIVISOR)
    .div(HlpConfig.BASIS_POINTS_DIVISOR);
};
