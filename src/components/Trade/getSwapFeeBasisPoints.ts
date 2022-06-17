import { BigNumber } from "ethers";
import {
  STABLE_SWAP_FEE_BASIS_POINTS,
  STABLE_TAX_BASIS_POINTS,
  SWAP_FEE_BASIS_POINTS,
  TAX_BASIS_POINTS
} from "../../config/hlp";
import { VaultTokenInfo } from "../../types/trade";
import { getFeeBasisPoints } from "./getFeeBasisPoints";
import { Network } from "../../types/network";
import HandleTokenManager from "../TokenManager/HandleTokenManager";

export const getSwapFeeBasisPoints = (
  args: {
    tokenIn: string;
    tokenOut: string;
    usdHlpDelta: BigNumber;
    usdHlpSupply: BigNumber;
    totalTokenWeights: BigNumber;
    targetUsdHlpAmount: BigNumber;
    getTokenInfo: (token: string) => VaultTokenInfo | undefined;
  },
  network: Network = "arbitrum"
) => {
  const tokenManager = new HandleTokenManager([]);
  const isStableSwap =
    tokenManager.isHlpStableTokenByAddress(args.tokenIn, network) &&
    tokenManager.isHlpStableTokenByAddress(args.tokenOut, network);
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
