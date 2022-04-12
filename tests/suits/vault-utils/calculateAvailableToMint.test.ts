import { expect } from "chai";
import { ethers } from "ethers";
import { createVault } from "../../../src/utils/vault-utils";
import {
  createMockCollaterals,
  createMockFxToken,
  createMockProtocolParams,
  createMockVaultDataFromMockCollaterals
} from "../../mock-data/mock-data-utils";

describe("calculateAvailableToMint", () => {
  it("It returns zero when user has no collateral deposited", async () => {
    const [collateral] = createMockCollaterals([{ price: ethers.constants.WeiPerEther }]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.Zero,
      [collateral],
      [ethers.constants.Zero]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    expect(vault.availableToMint.isZero()).to.eql(true);
  });

  it("It returns zero when vault is under min CR", async () => {
    const [collateral] = createMockCollaterals([{ price: ethers.constants.WeiPerEther }]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      [collateral],
      [ethers.constants.Zero]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    expect(vault.availableToMint.isZero()).to.eql(true);
  });

  it("It returns zero when user has exactly the correct CR", async () => {
    const [collateral] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      [collateral],
      [ethers.constants.WeiPerEther.mul(2)]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    expect(vault.availableToMint.isZero()).to.eql(true);
  });

  it("It returns more than zero when user is above minimum CR", async () => {
    const [collateral] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      [collateral],
      [ethers.utils.parseEther("2.1")]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    expect(vault.availableToMint.gt(0)).to.eql(true);
  });

  it("It returns the correct amount when minting fee is zero", async () => {
    const [collateral] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      [collateral],
      [ethers.constants.WeiPerEther.mul(4)]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateral]);

    expect(vault.availableToMint.eq(ethers.constants.WeiPerEther)).to.eql(true);
  });

  it("It returns the correct amount when minting fee is set", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);
    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      collaterals,
      [ethers.constants.WeiPerEther.mul(4)]
    );

    const protocolParams = createMockProtocolParams({ mintFee: ethers.utils.parseEther("0.05") });

    const vault = createVault(vaultData, protocolParams, fxToken, collaterals);

    expect(vault.availableToMint.eq(ethers.utils.parseEther("0.95238095238095238"))).to.eql(true);
  });
});

