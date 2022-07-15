import { BigNumber } from "ethers";
import { HlpConfig } from "../../config/hlp";
import { getFeeBasisPoints } from "./getFeeBasisPoints";

export const getHlpFeeBasisPoints = (args: {
  token: string;
  usdHlpDelta: BigNumber;
  isBuy: boolean;
  usdHlpSupply: BigNumber;
  totalTokenWeights: BigNumber;
  targetUsdHlpAmount: BigNumber;
  config: Pick<HlpConfig, "MINT_BURN_FEE_BASIS_POINTS" | "TAX_BASIS_POINTS">;
}) => {
  return getFeeBasisPoints({
    ...args,
    feeBasisPoints: BigNumber.from(args.config.MINT_BURN_FEE_BASIS_POINTS),
    taxBasisPoints: BigNumber.from(args.config.TAX_BASIS_POINTS),
    increment: args.isBuy
  });
};
