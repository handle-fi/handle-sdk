import { expect } from "chai";
import { ethers } from "ethers";
import { calculateMinimumMintingRatio } from "../../../src/utils/vault-utils";
import {
  createMockCollaterals,
  createMockVaultDataFromMockCollaterals
} from "../../mock-data/mock-data-utils";

describe("calculateMinimumMintingRatio", () => {
  it("It calculates the correct value with no collateral deposited", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") },
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("100") }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(ethers.constants.Zero, collaterals, [
      ethers.constants.Zero,
      ethers.constants.Zero
    ]);

    expect(calculateMinimumMintingRatio(vaultData, collaterals).eq(ethers.constants.Zero)).to.eql(true);
  });

  it("It calculates the correct value with the same price and deposit amounts", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") },
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("100") }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(ethers.constants.Zero, collaterals, [
      ethers.constants.WeiPerEther,
      ethers.constants.WeiPerEther
    ]);

    expect(
      calculateMinimumMintingRatio(vaultData, collaterals).eq(ethers.constants.WeiPerEther.mul(15).div(10))
    ).to.eql(true);
  });

  it("It calculates the correct value with the same price and different deposit amounts", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") },
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("100") }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(ethers.constants.Zero, collaterals, [
      ethers.constants.WeiPerEther,
      ethers.constants.WeiPerEther.mul(3)
    ]);

    expect(
      calculateMinimumMintingRatio(vaultData, collaterals).eq(
        ethers.constants.WeiPerEther.mul(125).div(100)
      )
    ).to.eql(true);
  });

  it("It calculates the correct value with the different prices and different deposit amounts", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") },
      { price: ethers.constants.WeiPerEther.div(2), mintCR: ethers.BigNumber.from("100") }
    ]);

    const vaultData = createMockVaultDataFromMockCollaterals(ethers.constants.Zero, collaterals, [
      ethers.constants.WeiPerEther,
      ethers.constants.WeiPerEther.mul(2)
    ]);

    expect(
      calculateMinimumMintingRatio(vaultData, collaterals).eq(ethers.constants.WeiPerEther.mul(15).div(10))
    ).to.eql(true);
  });
});

