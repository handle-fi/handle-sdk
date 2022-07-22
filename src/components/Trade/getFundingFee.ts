import { BigNumber } from "ethers";
import { FUNDING_RATE_PRECISION } from "../../config/hlp";
import { Position } from "./position";

export const getFundingFee = (
  { entryFundingRate, size }: Position,
  cumulativeFundingRate: BigNumber
): BigNumber =>
   size
     .mul(cumulativeFundingRate.sub(entryFundingRate))
     .div(FUNDING_RATE_PRECISION);
