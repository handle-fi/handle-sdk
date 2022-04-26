import { BigNumber } from "ethers";
import { FUNDING_RATE_PRECISION } from "../../config/hlp-config";
import { Position } from "./position";

export const getFundingFee = (position: Position, cumulativeFundingRate: BigNumber) => {
  let { entryFundingRate, size } = position;
  if (entryFundingRate && cumulativeFundingRate) {
    return size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION);
  }
  return;
};
