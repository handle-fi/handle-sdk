import { FUNDING_RATE_PRECISION } from "../../perp-config";
import { Position } from "./position";

export const getFundingFee = (position: Position) => {
  let { entryFundingRate, cumulativeFundingRate, size } = position;
  if (entryFundingRate && cumulativeFundingRate) {
    return size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION);
  }
  return;
};
