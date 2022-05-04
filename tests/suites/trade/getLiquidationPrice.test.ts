import { expect } from "chai";
import { ethers } from "hardhat";
import { getLiquidationPrice, Position } from "../../../src/components/Trade";
import { TradeUtils } from "../../../src";
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

const EXISTING_POSITION = () => {
  const position = ZERO_POSITION();
  position.size = ethers.utils.parseUnits("50", 30);
  position.collateral = ethers.utils.parseUnits("25", 30);
  position.averagePrice = ethers.utils.parseUnits("1", 30);
  position.entryFundingRate = bn(100);
  return position;
};

const bn = BigNumber.from;

describe("getLiquidationPrice", () => {
  describe("no initial position", () => {
    it("can calculate liquidation price for a long position", async () => {
      const position = ZERO_POSITION();
      position.isLong = true;
      position.averagePrice = bn("0x8c2bb4717cfe748e2874c0000000");

      const delta = {
        collateralDelta: bn("0x8c2bb4717cfe748e2874c0000000"),
        sizeDelta: bn("0x014f9ab2464536f038b6a8d0f2e000"),
        increaseCollateral: true,
        increaseSize: true
      };

      const price = TradeUtils.getLiquidationPrice(position, ethers.constants.Zero, delta);
      expect(ethers.utils.formatUnits(price, 30)).to.equal("1712.433666666666666382475964222223");
    });
    it("can calculate liquidation price for a short position", async () => {
      const position = ZERO_POSITION();
      position.averagePrice = bn("0x8bfa7add196bc82c889660000000");

      const delta = {
        collateralDelta: bn("0x04ee2d6d415b85acef8100000000"),
        sizeDelta: bn("0x0bcdf91fbc8f1fc0d6f3bef91800"),
        increaseCollateral: true,
        increaseSize: true
      };

      const price = TradeUtils.getLiquidationPrice(position, ethers.constants.Zero, delta);
      expect(ethers.utils.formatUnits(price, 30)).to.equal("3968.115433333333340091773551376522");
    });
  });
  describe("initial position", () => {
    it("can calculate liquidation price for a long position", async () => {
      const position = EXISTING_POSITION();
      position.isLong = true;
      const price = getLiquidationPrice(position, bn(100));
      expect(ethers.utils.formatUnits(price, 30)).to.equal("0.541");
    });
    it("can calculate liquidation price for a short position", async () => {
      const position = EXISTING_POSITION();
      const price = getLiquidationPrice(position, bn(100));
      expect(ethers.utils.formatUnits(price, 30)).to.equal("1.459");
    });
  });
  describe("inital position and delta position", () => {
    describe("long", () => {
      it("is correct when subtracting position size and collateral", async () => {
        const position = EXISTING_POSITION();
        position.isLong = true;

        const delta = {
          increaseCollateral: false,
          increaseSize: false,
          sizeDelta: ethers.utils.parseUnits("25", 30),
          collateralDelta: ethers.utils.parseUnits("10", 30)
        };

        const price = getLiquidationPrice(position, bn(100), delta);
        expect(ethers.utils.formatUnits(price, 30)).to.equal("0.482");
      });
      it("is correct when adding position size and collateral", async () => {
        const position = EXISTING_POSITION();
        position.isLong = true;

        const delta = {
          increaseCollateral: true,
          increaseSize: true,
          sizeDelta: ethers.utils.parseUnits("25", 30),
          collateralDelta: ethers.utils.parseUnits("10", 30)
        };

        const price = getLiquidationPrice(position, bn(100), delta);
        expect(ethers.utils.formatUnits(price, 30)).to.equal("0.560666666666666666666666666667");
      });
    });
    describe("short", () => {
      it("is correct when subtracting position size and collateral", async () => {
        const position = EXISTING_POSITION();

        const delta = {
          increaseCollateral: false,
          increaseSize: false,
          sizeDelta: ethers.utils.parseUnits("25", 30),
          collateralDelta: ethers.utils.parseUnits("10", 30)
        };

        const price = getLiquidationPrice(position, bn(100), delta);
        expect(ethers.utils.formatUnits(price, 30)).to.equal("1.518");
      });
      it("is correct when adding position size and collateral", async () => {
        const position = EXISTING_POSITION();

        const delta = {
          increaseCollateral: true,
          increaseSize: true,
          sizeDelta: ethers.utils.parseUnits("25", 30),
          collateralDelta: ethers.utils.parseUnits("10", 30)
        };

        const price = getLiquidationPrice(position, bn(100), delta);
        expect(ethers.utils.formatUnits(price, 30)).to.equal("1.439333333333333333333333333333");
      });
    });
  });
});
