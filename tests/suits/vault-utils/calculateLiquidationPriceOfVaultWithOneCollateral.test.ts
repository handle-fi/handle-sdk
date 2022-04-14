import { expect } from "chai";
import { ethers } from "ethers";
import { createVault } from "../../../src/utils/vault-utils";
import {
  createMockCollaterals,
  createMockFxToken,
  createMockProtocolParams,
  createMockVaultDataFromMockCollaterals
} from "../../mock-data/mock-data-utils";
import { vaultUtils } from "../../../src/utils/vault-utils";

describe("calculateLiquidationPriceOfVaultWithOneCollateral", () => {
  it("It returns zero when no collateral is deposited", async () => {
    const [collateral] = createMockCollaterals([{ price: ethers.constants.WeiPerEther }]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      [collateral],
      [ethers.constants.Zero]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    const result = vaultUtils.calculateLiquidationPriceOfVaultWithOneCollateral(vault, collateral);

    expect(result.isZero()).to.eql(true);
  });

  it("It returns zero when debt is zero", async () => {
    const [collateral] = createMockCollaterals([{ price: ethers.constants.WeiPerEther }]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.Zero,
      [collateral],
      [ethers.constants.WeiPerEther]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    const result = vaultUtils.calculateLiquidationPriceOfVaultWithOneCollateral(vault, collateral);

    expect(result.isZero()).to.eql(true);
  });

  it("It returns the correct value when debt is greater than zero and CR are greater than 110", async () => {
    const [collateral] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("250") }
    ]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      [collateral],
      [ethers.constants.WeiPerEther.mul(2)]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    const result = vaultUtils.calculateLiquidationPriceOfVaultWithOneCollateral(vault, collateral);

    expect(result.eq(ethers.constants.WeiPerEther)).to.eql(true);
  });

  it("It returns the correct value when debt is greater than zero and CR is less than 110", async () => {
    const [collateral] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("109") }
    ]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      [collateral],
      [ethers.constants.WeiPerEther.mul(2)]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    const result = vaultUtils.calculateLiquidationPriceOfVaultWithOneCollateral(vault, collateral);

    expect(result.eq(ethers.constants.WeiPerEther.mul(11).div(10).div(2))).to.eql(true);
  });
});

