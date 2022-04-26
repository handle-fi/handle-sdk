import { expect } from "chai";
import { ethers } from "ethers";
import { createVault } from "../../src/utils/vault-utils";
import {
  createMockCollaterals,
  createMockVaultDataFromMockCollaterals
} from "../mock-data/mock-data-utils";
import { ProtocolParameters, VaultController } from "../../src";
import { createMockFxToken, createMockProtocolParams } from "../mock-data/mock-data-utils";

const { WeiPerEther } = ethers.constants;

const createVaultController = (protocolParameters: ProtocolParameters) => {
  const collaterals = createMockCollaterals([{}]);
  const fxToken = createMockFxToken();

  const vaultData = createMockVaultDataFromMockCollaterals(WeiPerEther, collaterals, [WeiPerEther]);

  const vault = createVault(vaultData, protocolParameters, fxToken, collaterals);

  const vaultController = new VaultController(vault, protocolParameters, fxToken, collaterals);

  return {
    vaultController,
    collaterals,
    fxToken
  };
};

describe("VaultController", () => {
  describe("addDebt", () => {
    it("It increases debt by the correct amount when mint fee is zero", async () => {
      const { vaultController } = createVaultController(createMockProtocolParams());
      vaultController.addDebt(WeiPerEther);
      expect(vaultController.vault.debt.eq(ethers.utils.parseEther("2"))).to.eql(true);
    });

    it("It increases debt by the correct amount when mint fee is greater than zero", async () => {
      const { vaultController } = createVaultController(
        createMockProtocolParams({ mintFee: ethers.utils.parseEther("0.05") })
      );
      vaultController.addDebt(WeiPerEther);
      expect(vaultController.vault.debt.eq(ethers.utils.parseEther("2.05"))).to.eql(true);
    });
  });

  describe("addCollateral", () => {
    it("It increases collateral by the correct amount when deposit fee is zero", async () => {
      const { vaultController, collaterals } = createVaultController(createMockProtocolParams());

      const vaultCollateralSymbol = collaterals[0].symbol;

      vaultController.addCollateral(vaultCollateralSymbol, WeiPerEther);

      const updatedCollateral = vaultController.vault.collateral.find(
        (collateral) => collateral.symbol === vaultCollateralSymbol
      )!;

      expect(updatedCollateral.amount.eq(ethers.utils.parseEther("2"))).to.eql(true);
    });

    it("It increases collateral by the correct amount when deposit fee is greater than zero", async () => {
      const { vaultController, collaterals } = createVaultController(
        createMockProtocolParams({ depositFee: ethers.utils.parseEther("0.05") })
      );

      const vaultCollateralSymbol = collaterals[0].symbol;

      vaultController.addCollateral(vaultCollateralSymbol, WeiPerEther);

      const updatedCollateral = vaultController.vault.collateral.find(
        (collateral) => collateral.symbol === vaultCollateralSymbol
      )!;

      expect(updatedCollateral.amount.eq(ethers.utils.parseEther("1.95"))).to.eql(true);
    });
  });
});
