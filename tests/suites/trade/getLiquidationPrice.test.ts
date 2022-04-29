import { expect } from "chai";
import { ethers } from "hardhat";
import { getNextAveragePrice, Position } from "../../../src/components/Trade";
import { TradeUtils, HlpConfig } from "../../../src";
import { BigNumber } from "ethers";

const ZERO_POSITION = (
  indexToken = ethers.constants.AddressZero,
  collateralToken = ethers.constants.AddressZero
): Position => ({
  averagePrice: ethers.constants.Zero,
  collateral: ethers.constants.Zero,
  collateralToken,
  indexToken,
  delta: ethers.constants.Zero,
  entryFundingRate: ethers.constants.Zero,
  hasProfit: false,
  hasRealisedProfit: false,
  isLong: false,
  lastIncreasedTime: ethers.constants.Zero,
  leverage: ethers.constants.Zero,
  netValue: ethers.constants.Zero,
  positionFee: ethers.constants.Zero,
  realisedPnL: ethers.constants.Zero,
  size: ethers.constants.Zero
});

describe("getLiquidationPrice", () => {
  it("can calculate liquidation price", async () => {
    const position = ZERO_POSITION();
    const delta = {
      collateralDelta: ethers.utils.parseUnits("2992.48", HlpConfig.PRICE_DECIMALS),
      sizeDelta: ethers.utils.parseUnits("14497.53", HlpConfig.PRICE_DECIMALS),
      increaseCollateral: true,
      increaseSize: true
    };
    const averagePrice = getNextAveragePrice(
      position.size,
      delta.sizeDelta,
      position.delta,
      position.hasProfit,
      position.isLong,
      ethers.utils.parseUnits("2992.48", HlpConfig.PRICE_DECIMALS)
    );
    if (averagePrice) position.averagePrice = averagePrice;
    const price = TradeUtils.getLiquidationPrice(position, BigNumber.from(215824), delta);
    expect(price.toString()).to.equal("3482.38");
  });
});
