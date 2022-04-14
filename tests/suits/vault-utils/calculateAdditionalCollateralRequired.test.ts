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
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);

    const params = createMockProtocolParams();

    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(ethers.constants.One, collaterals, [
      ethers.constants.WeiPerEther
    ]);

    const vault = createVault(vaultData, params, fxToken, collaterals);

    const result = calculateAdditionalCollateralRequired(
      vault,
      collaterals[0].symbol,
      collaterals,
      fxToken,
      params
    );

    expect(result.eq(ethers.constants.Zero)).to.eql(true);
  });

  it("It returns zero when user has exactly enough collateral deposited", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);

    const params = createMockProtocolParams();

    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      collaterals,
      [ethers.constants.WeiPerEther.mul(2)]
    );

    const vault = createVault(vaultData, params, fxToken, collaterals);

    const result = calculateAdditionalCollateralRequired(
      vault,
      collaterals[0].symbol,
      collaterals,
      fxToken,
      params
    );

    expect(result.eq(ethers.constants.Zero)).to.eql(true);
  });

  it("It returns the debt multiplied by collateral's mintCR when collateral deposited is zero", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);

    const params = createMockProtocolParams();

    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      collaterals,
      [ethers.constants.Zero]
    );

    const vault = createVault(vaultData, params, fxToken, collaterals);

    const result = calculateAdditionalCollateralRequired(
      vault,
      collaterals[0].symbol,
      collaterals,
      fxToken,
      params
    );

    expect(result.eq(ethers.constants.WeiPerEther.mul(2))).to.eql(true);
  });

  it("It returns the correct value when there is collateral deposited", async () => {
    const collaterals = createMockCollaterals([
      { price: ethers.constants.WeiPerEther, mintCR: ethers.BigNumber.from("200") }
    ]);

    const params = createMockProtocolParams();

    const fxToken = createMockFxToken();

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther.mul(2),
      collaterals,
      [ethers.constants.WeiPerEther]
    );

    const vault = createVault(vaultData, params, fxToken, collaterals);

    const result = calculateAdditionalCollateralRequired(
      vault,
      collaterals[0].symbol,
      collaterals,
      fxToken,
      params
    );

    expect(result.eq(ethers.constants.WeiPerEther.mul(3))).to.eql(true);
  });
});

