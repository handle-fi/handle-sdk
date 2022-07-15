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
  config: Pick<HlpConfig, "mintBurnFeeBasisPoints" | "taxBasisPoints">;
}) => {
  return getFeeBasisPoints({
    ...args,
    feeBasisPoints: BigNumber.from(args.config.mintBurnFeeBasisPoints),
    taxBasisPoints: BigNumber.from(args.config.taxBasisPoints),
    increment: args.isBuy
  });
};
