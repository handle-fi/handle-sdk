import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR } from "../../hlp-config";
import { VaultTokenInfo } from "./types";
import { getSwapFeeBasisPoints } from "./getSwapFeeBasisPoints";

export const getSwapFee = (args: {
  tokenIn: string;
  tokenOut: string;
  amountIn: BigNumber;
  usdgSupply: BigNumber;
  totalTokenWeights: BigNumber;
  targetUsdgAmount: BigNumber;
  getTokenInfo: (token: string) => VaultTokenInfo | undefined;
}) => {
  const swapBasisPoints = getSwapFeeBasisPoints({
    ...args,
    usdgDelta: args.amountIn
  });
  return args.amountIn.mul(swapBasisPoints).div(BASIS_POINTS_DIVISOR);
};
