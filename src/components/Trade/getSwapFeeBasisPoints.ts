import { BigNumber } from "ethers";
import { HLP_TOKENS } from "../../config/hlp-config";
import {
  STABLE_SWAP_FEE_BASIS_POINTS,
  STABLE_TAX_BASIS_POINTS,
  SWAP_FEE_BASIS_POINTS,
  TAX_BASIS_POINTS
} from "../../config/hlp-config";
import { VaultTokenInfo } from "./types";
import { getFeeBasisPoints } from "./getFeeBasisPoints";
import { Network } from "../../types/network";

export const getSwapFeeBasisPoints = (
  args: {
    tokenIn: string;
    tokenOut: string;
    usdgDelta: BigNumber;
    usdgSupply: BigNumber;
    totalTokenWeights: BigNumber;
    targetUsdgAmount: BigNumber;
    getTokenInfo: (token: string) => VaultTokenInfo | undefined;
  },
  network: Network = "arbitrum"
) => {
  const isStableSwap =
    HLP_TOKENS[network].some((token) => token.address === args.tokenIn && token.isStable) &&
    HLP_TOKENS[network].some((token) => token.address === args.tokenOut && token.isStable);
  const swapBasisPoints = isStableSwap ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS;
  const taxBasisPoints = isStableSwap ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS;

  const feeBasisPoints1 = getFeeBasisPoints({
    ...args,
    increment: true,
    feeBasisPoints: BigNumber.from(swapBasisPoints),
    taxBasisPoints: BigNumber.from(taxBasisPoints),
    token: args.tokenIn
  });
  const feeBasisPoints2 = getFeeBasisPoints({
    ...args,
    increment: false,
    feeBasisPoints: BigNumber.from(swapBasisPoints),
    taxBasisPoints: BigNumber.from(taxBasisPoints),
    token: args.tokenOut
  });
  // return largest fee basis points
  return feeBasisPoints1.gt(feeBasisPoints2) ? feeBasisPoints1 : feeBasisPoints2;
};
