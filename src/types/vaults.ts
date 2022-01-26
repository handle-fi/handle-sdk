import { ethers } from "ethers";
import { FxTokenSymbol } from "..";
import { CollateralSymbol } from "./collaterals";
import { Token } from "./general";

export type SingleCollateralVaultSymbol = "fxAUD-WETH";

type VaultFxToken = Token<FxTokenSymbol>;

type VaultCollateral<T> = Token<T> & {
  amount: ethers.BigNumber;
};

export type VaultData = {
  account: string;
  debt: ethers.BigNumber;
  fxToken: VaultFxToken;
  collateral: VaultCollateral<CollateralSymbol>[];
};

export type SingleCollateralVaultData = {
  account: string;
  debt: ethers.BigNumber;
  collateral: VaultCollateral<string>;
  interestPerYear: ethers.BigNumber;
  availableToBorrow: ethers.BigNumber;
  currentBorrowAmount: ethers.BigNumber;
  totalCollateralShare: ethers.BigNumber;
  exchangeRate: ethers.BigNumber;
};

type VaultBase = {
  fxToken: VaultFxToken;
  debtAsEth: ethers.BigNumber;
  utilisation: ethers.BigNumber;
  availableToMint: ethers.BigNumber;
  collateralAsFxToken: ethers.BigNumber;
  collateralAsEth: ethers.BigNumber;
  collateralRatio: ethers.BigNumber;
  minimumMintingRatio: ethers.BigNumber;
  minimumDebt: ethers.BigNumber;
};

export type Vault = VaultData &
  VaultBase & {
    isRedeemable: boolean;
    redeemableTokens: ethers.BigNumber;
    collateral: VaultCollateral<CollateralSymbol>[];
  };

export type SingleCollateralVault = SingleCollateralVaultData &
  VaultBase & {
    vaultSymbol: SingleCollateralVaultSymbol;
  };
