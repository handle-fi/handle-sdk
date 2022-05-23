import { ethers } from "ethers";
import { FxToken } from "../types/fxTokens";
import { SingleCollateralVault, SingleCollateralVaultData } from "../types/vaults";
import { createSingleCollateralVault } from "../utils/vault-utils";

export default class VaultController {
  public vault: SingleCollateralVault;

  constructor(private currentVault: SingleCollateralVaultData, private fxToken: FxToken) {
    this.vault = createSingleCollateralVault(currentVault, fxToken);
  }

  public setDebt = (debt: ethers.BigNumber) => {
    this.vault = createSingleCollateralVault(
      {
        ...this.vault,
        debt
      },
      this.fxToken
    );
  };

  public addDebt = (amount: ethers.BigNumber) => {
    this.setDebt(this.currentVault.debt.add(amount));
  };

  public removeDebt = (amount: ethers.BigNumber) => {
    this.setDebt(this.currentVault.debt.sub(amount));
  };

  public setCollateralAmount = (amount: ethers.BigNumber) => {
    this.vault = createSingleCollateralVault(
      {
        ...this.vault,
        collateral: {
          ...this.currentVault.collateral,
          amount
        }
      },
      this.fxToken
    );
  };

  public addCollateral = (amount: ethers.BigNumber) => {
    this.setCollateralAmount(this.currentVault.collateral.amount.add(amount));
  };

  public removeCollateral = (amount: ethers.BigNumber) => {
    this.setCollateralAmount(this.currentVault.collateral.amount.sub(amount));
  };

  public resetCollateral = () => {
    this.vault = createSingleCollateralVault(
      {
        ...this.vault,
        collateral: this.currentVault.collateral
      },
      this.fxToken
    );
  };
}
