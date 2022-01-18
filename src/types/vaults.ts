import { ethers } from "ethers";
import { FxTokenSymbol } from "..";
import { CollateralSymbol } from "./collaterals";

export type VaultData = {
  account: string;
  fxToken: {
    symbol: FxTokenSymbol;
    address: string;
  };
  debt: ethers.BigNumber;
  collateral: { symbol: CollateralSymbol; address: string; amount: ethers.BigNumber }[];
};

export type Vault = VaultData & {
  debtAsEth: ethers.BigNumber;
  debtAsFxToken: ethers.BigNumber;
  utilisation: ethers.BigNumber;
  availableToMint: ethers.BigNumber;
  collateralAsEth: ethers.BigNumber;
  collateralRatio: ethers.BigNumber;
  isRedeemable: boolean;
  redeemableTokens: ethers.BigNumber;
  minimumMintingRatio: ethers.BigNumber;
  minimumDebt: ethers.BigNumber;
};
