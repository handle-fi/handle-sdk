import { BigNumber } from "ethers";
import { MINT_BURN_FEE_BASIS_POINTS } from "../../perp-config";
import { TAX_BASIS_POINTS } from "../../perp-config";
import { VaultTokenInfo } from "./types";
import { getFeeBasisPoints } from "./getFeeBasisPoints";

export const getHlpFeeBasisPoints = (args: {
  token: string;
  usdgDelta: BigNumber;
  isBuy: boolean;
  usdgSupply: BigNumber;
  totalTokenWeights: BigNumber;
  targetUsdgAmount: BigNumber;
  getTokenInfo: (token: string) => VaultTokenInfo | undefined;
}) => {
  return getFeeBasisPoints({
    ...args,
    feeBasisPoints: BigNumber.from(MINT_BURN_FEE_BASIS_POINTS),
    taxBasisPoints: BigNumber.from(TAX_BASIS_POINTS),
    increment: args.isBuy
  });
};
