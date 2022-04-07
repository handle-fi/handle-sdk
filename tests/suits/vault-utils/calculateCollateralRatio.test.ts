import { expect } from "chai";
import { ethers } from "ethers";
import { calculateMinimumRatio } from "../../../src/utils/vault-utils";
import {
  createMockCollaterals,
  createMockVaultDataFromMockCollaterals
} from "../../mock-data/mock-data-utils";

describe("calculateCollateralRatio", () => {
  it("It calculates the correct value with no collateral deposited", async () => {
    const collaterals = createMockCollaterals([{ price: ethers.constants.WeiPerEther }]);

    const vaultData = createMockVaultDataFromMockCollaterals(ethers.constants.Zero, collaterals, [
      ethers.constants.Zero
    ]);

    const result = calculateMinimumRatio(vaultData, collaterals);

    expect(result.eq(ethers.constants.Zero)).to.eql(true);
  });

  it("It calculates the correct value with whole numbers", async () => {
    const collaterals = createMockCollaterals([{ price: ethers.constants.WeiPerEther }]);

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.constants.WeiPerEther,
      collaterals,
      [ethers.constants.WeiPerEther.mul(2)]
    );

    const result = calculateMinimumRatio(vaultData, collaterals);

    expect(result.eq(ethers.constants.WeiPerEther.mul(2))).to.eql(true);
  });

  it("It calculates the correct value with partial numbers", async () => {
    const collaterals = createMockCollaterals([{ price: ethers.constants.WeiPerEther }]);

    const vaultData = createMockVaultDataFromMockCollaterals(
      ethers.utils.parseEther("200"),
      collaterals,
      [ethers.utils.parseEther("0.0024338771676128")]
    );

    const result = calculateMinimumRatio(vaultData, collaterals);

    expect(result.eq(ethers.constants.WeiPerEther.mul(2))).to.eql(true);
  });
});

