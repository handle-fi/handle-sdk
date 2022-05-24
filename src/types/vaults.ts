import { TokenInfo } from "@uniswap/token-lists";
import { ethers } from "ethers";
import { CollateralSymbol } from "./collaterals";
import { FxToken } from "./fxTokens";

export type SingleCollateralVaultSymbol = "fxAUD-WETH" | "fxAUD-WBTC";

type VaultFxToken = FxToken;

export type VaultCollateralToken<T> = TokenInfo & {
  amount: ethers.BigNumber;
} & {
  symbol: T;
};

export type VaultData = {
  account: string;
  debt: ethers.BigNumber;
  fxToken: VaultFxToken;
  collateral: VaultCollateralToken<CollateralSymbol>[];
};

export type SingleCollateralVaultData = {
  account: string;
  debt: ethers.BigNumber;
  collateral: VaultCollateralToken<string>;
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
  interestRate: ethers.BigNumber;
};

export type Vault = VaultData &
  VaultBase & {
    isRedeemable: boolean;
    redeemableTokens: ethers.BigNumber;
    collateral: VaultCollateralToken<CollateralSymbol>[];
  };

export type SingleCollateralVault = SingleCollateralVaultData &
  VaultBase & {
    vaultSymbol: SingleCollateralVaultSymbol;
    liquidationPrice: ethers.BigNumber;
  };
