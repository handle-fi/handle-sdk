import { BigNumber } from "ethers";
import { BASIS_POINTS_DIVISOR, HlpDynamicConfig } from "../../config/hlp";
import { VaultTokenInfo } from "../../types/trade";
import { getSwapFeeBasisPoints, RequiredConfig } from "./getSwapFeeBasisPoints";

export const getSwapFee = (args: {
  tokenIn: string;
  tokenOut: string;
  amountIn: BigNumber;
  usdHlpSupply: BigNumber;
  totalTokenWeights: BigNumber;
  targetUsdHlpAmount: BigNumber;
  getTokenInfo: (token: string) => VaultTokenInfo | undefined;
  config: Pick<HlpDynamicConfig, RequiredConfig>;
}) => {
  const swapBasisPoints = getSwapFeeBasisPoints({
    ...args,
    usdHlpDelta: args.amountIn
  });
  return args.amountIn.mul(swapBasisPoints).div(BASIS_POINTS_DIVISOR);
};
