import { BigNumber } from "ethers";
import { MINT_BURN_FEE_BASIS_POINTS } from "../../config/hlp";
import { TAX_BASIS_POINTS } from "../../config/hlp";
import { getFeeBasisPoints } from "./getFeeBasisPoints";

export const getHlpFeeBasisPoints = (args: {
  token: string;
  usdHlpDelta: BigNumber;
  isBuy: boolean;
  usdHlpSupply: BigNumber;
  totalTokenWeights: BigNumber;
  targetUsdHlpAmount: BigNumber;
}) => {
  return getFeeBasisPoints({
    ...args,
    feeBasisPoints: BigNumber.from(MINT_BURN_FEE_BASIS_POINTS),
    taxBasisPoints: BigNumber.from(TAX_BASIS_POINTS),
    increment: args.isBuy
  });
};
