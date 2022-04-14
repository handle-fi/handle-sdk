import { ethers } from "ethers";
import { Collateral, FxToken, ProtocolParameters } from "..";
import { CollateralSymbol } from "../types/collaterals";
import { Vault, VaultData } from "../types/vaults";
import { createVault } from "../utils/vault-utils";

export default class VaultController {
  public vault: Vault;

  constructor(
    private currentVault: VaultData,
    private protocolParameters: ProtocolParameters,
    private fxToken: FxToken,
    private collaterals: Collateral[]
  ) {
    this.vault = createVault(currentVault, protocolParameters, fxToken, collaterals);
  }

  public setDebt = (debt: ethers.BigNumber) => {
    this.vault = createVault(
      {
        ...this.vault,
        debt
      },
      this.protocolParameters,
      this.fxToken,
      this.collaterals
    );
  };

  public addDebt = (amount: ethers.BigNumber) => {
    const fee = amount.mul(this.protocolParameters.mintFee).div(ethers.constants.WeiPerEther);
    this.setDebt(this.currentVault.debt.add(amount).add(fee));
  };

  public removeDebt = (amount: ethers.BigNumber) => {
    this.setDebt(this.currentVault.debt.sub(amount));
  };

  private setCollateral = (symbol: CollateralSymbol, amount: ethers.BigNumber) => {
    const currentCollateral = this.getCollateral(symbol);

    const updatedCollateral = {
      ...currentCollateral,
      amount
    };

    const collateral = [
      ...this.currentVault.collateral.filter((collateral) => collateral.symbol !== symbol),
      updatedCollateral
    ];

    this.vault = createVault(
      {
        ...this.vault,
        collateral
      },
      this.protocolParameters,
      this.fxToken,
      this.collaterals
    );
  };

  public addCollateral = (symbol: CollateralSymbol, amount: ethers.BigNumber) => {
    const currentCollateral = this.getCollateral(symbol);
    const fee = amount.mul(this.protocolParameters.depositFee).div(ethers.constants.WeiPerEther);
    this.setCollateral(symbol, currentCollateral.amount.add(amount).sub(fee));
  };

  public removeCollateral = (symbol: CollateralSymbol, amount: ethers.BigNumber) => {
    const currentCollateral = this.getCollateral(symbol);
    this.setCollateral(symbol, currentCollateral.amount.sub(amount));
  };

  public resetCollateral = () => {
    this.vault = createVault(
      {
        ...this.vault,
        collateral: this.currentVault.collateral
      },
      this.protocolParameters,
      this.fxToken,
      this.collaterals
    );
  };

  private getCollateral = (symbol: CollateralSymbol) => {
    const collateral = this.currentVault.collateral.find(
      (collateral) => collateral.symbol === symbol
    );
    if (!collateral) {
      throw new Error("Symbol doesnt match any collateral in vault");
    }

    return collateral;
  };
}

