import { expect } from "chai";
import { ethers } from "ethers";
import { vaultUtils, createVault } from "../../../src/utils/vault-utils";

const { calculateAdditionalCollateralRequired } = vaultUtils;

import {
  createMockCollaterals,
  createMockFxToken,
  createMockProtocolParams,
  createMockVaultDataFromMockCollaterals
} from "../../mock-data/mock-data-utils";

describe("calculateAdditionalCollateralRequired", () => {
  it("It returns zero when user has more than enough collateral deposited", async () => {
    const [collateralOne] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);

    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.One,
      [collateralOne],
      [ethers.constants.WeiPerEther]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateralOne]);

    const result = calculateAdditionalCollateralRequired(
      ethers.constants.One,
      collateralOne,
      fxToken,
      vault
    );

    expect(result.eq(ethers.constants.Zero)).to.eql(true);
  });

  it("It returns zero when user has exactly enough collateral deposited", async () => {
    const [collateralOne] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);

    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      [collateralOne],
      [ethers.constants.WeiPerEther.mul(4)]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateralOne]);

    const result = calculateAdditionalCollateralRequired(
      ethers.constants.WeiPerEther,
      collateralOne,
      fxToken,
      vault
    );

    expect(result.eq(ethers.constants.Zero)).to.eql(true);
  });

  it("It returns the additional debt multiplied by collateral's mintCR when collateral and debt are zero", async () => {
    const [collateralOne] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);

    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.Zero,
      [collateralOne],
      [ethers.constants.Zero]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateralOne]);

    const result = calculateAdditionalCollateralRequired(
      ethers.constants.WeiPerEther,
      collateralOne,
      fxToken,
      vault
    );

    expect(result.eq(ethers.constants.WeiPerEther.mul(2))).to.eql(true);
  });

  it("It returns the correct value when the vault has debt", async () => {
    const [collateralOne] = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);

    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      [collateralOne],
      [ethers.constants.WeiPerEther.mul(2)]
    );

    const vault = createVault(vaultData, createMockProtocolParams(), fxToken, [collateralOne]);

    const result = calculateAdditionalCollateralRequired(
      ethers.constants.WeiPerEther,
      collateralOne,
      fxToken,
      vault
    );

    expect(result.eq(ethers.constants.WeiPerEther.mul(2))).to.eql(true);
  });
});

