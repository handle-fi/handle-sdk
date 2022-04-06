import { expect } from "chai";
import { ethers } from "ethers";
import { calculateLiquidationFee } from "../../../src/utils/vault-utils";
import {
  createMockCollaterals,
  createMockVaultDataFromMockCollaterals
} from "../../mock-data/mock-data-utils";

describe("calculateLiquidationFee", () => {
  it("It returns zero when no collateral is deposited", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, liquidationFee: ethers.BigNumber.from("1000") }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(ethers.constants.Zero, collaterals, [
      ethers.constants.Zero
    ]);

    const result = calculateLiquidationFee(vaultData, collaterals);
    expect(result.isZero()).to.eql(true);
  });

  it("It returns correct value when one collateral is deposited", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, liquidationFee: ethers.BigNumber.from("100") }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(ethers.constants.Zero, collaterals, [
      ethers.constants.WeiPerEther
    ]);

    const result = calculateLiquidationFee(vaultData, collaterals);

    expect(result.eq(ethers.constants.WeiPerEther.div(100))).to.eql(true);
  });

  it("It returns correct value when two collaterals are deposited", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, liquidationFee: ethers.BigNumber.from("100") },
      { price: ethers.constants.WeiPerEther, liquidationFee: ethers.BigNumber.from("200") }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(ethers.constants.Zero, collaterals, [
      ethers.constants.WeiPerEther,
      ethers.constants.WeiPerEther
    ]);

    const result = calculateLiquidationFee(vaultData, collaterals);

    expect(result.eq(ethers.constants.WeiPerEther.mul(15).div(1000))).to.eql(true);
  });
});

