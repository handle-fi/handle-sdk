import { expect } from "chai";
import { ethers } from "ethers";
import { calculateSingleCollateralVaultLiquidationPrice } from "../../../src/utils/vault-utils";
import {
  createMockCollaterals,
  createVaultCollateralFromCollateral
} from "../../mock-data/mock-data-utils";

const minimumCollateralRatio = ethers.utils.parseEther("1.5");

describe("calculateSingleCollateralVaultLiquidationPrice", () => {
  it("It returns zero when user has no collateral deposited", async () => {
    const [collateral] = createMockCollaterals([{}]);
    const vaultCollateral = createVaultCollateralFromCollateral(collateral, ethers.constants.Zero);

    const result = calculateSingleCollateralVaultLiquidationPrice(
      ethers.constants.WeiPerEther,
      vaultCollateral,
      ethers.constants.Zero,
      minimumCollateralRatio
    );

    expect(result.isZero()).to.eql(true);
  });

  it("It returns zero when user has no debt", async () => {
    const [collateral] = createMockCollaterals([{}]);
    const vaultCollateral = createVaultCollateralFromCollateral(
      collateral,
      ethers.constants.WeiPerEther
    );

    const result = calculateSingleCollateralVaultLiquidationPrice(
      ethers.constants.Zero,
      vaultCollateral,
      ethers.constants.WeiPerEther,
      minimumCollateralRatio
    );

    expect(result.isZero()).to.eql(true);
  });

  it("It returns the correct liquidation price", async () => {
    const [collateral] = createMockCollaterals([{}]);
    const vaultCollateral = createVaultCollateralFromCollateral(
      collateral,
      ethers.constants.WeiPerEther
    );

    const result = calculateSingleCollateralVaultLiquidationPrice(
      ethers.constants.WeiPerEther,
      vaultCollateral,
      ethers.constants.WeiPerEther.mul(2),
      minimumCollateralRatio
    );

    expect(result.eq(minimumCollateralRatio)).to.eql(true);
  });
});
