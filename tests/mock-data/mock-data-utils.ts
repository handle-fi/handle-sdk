import { ethers } from "ethers";
import {
  Collateral,
  CollateralSymbol,
  FxToken,
  FxTokenSymbol,
  ProtocolParameters
} from "../../src";
import { VaultCollateral, VaultData } from "../../src/types/vaults";

export const createMockCollateral = (overides: Partial<Collateral> = {}): Collateral => {
  return {
    symbol: `COLLATERAL_${randomId()}` as unknown as CollateralSymbol,
    address: ethers.Wallet.createRandom().address,
    decimals: 18,
    mintCR: ethers.BigNumber.from("200"),
    liquidationFee: ethers.BigNumber.from("1250"),
    interestRate: ethers.BigNumber.from("25"),
    price: ethers.constants.WeiPerEther,
    ...overides
  };
};

export const createMockCollaterals = (overides: Partial<Collateral>[]) => {
  return overides.map(createMockCollateral);
};

export const createMockFxToken = (overides: Partial<FxToken> = {}): FxToken => {
  return {
    symbol: `FX_${randomId()}` as unknown as FxTokenSymbol,
    address: ethers.Wallet.createRandom().address,
    decimals: 18,
    price: ethers.constants.WeiPerEther,
    ...overides
  };
};

export const createVaultCollateralFromCollateral = (
  collateral: Collateral,
  amount: ethers.BigNumber
): VaultCollateral<CollateralSymbol> => {
  return {
    symbol: collateral.symbol,
    decimals: collateral.decimals,
    address: collateral.address,
    amount
  };
};

export const createMockVaultData = (
  debt: ethers.BigNumber,
  collateral: VaultCollateral<CollateralSymbol>[]
): VaultData => {
  return {
    account: "0x3e5c9ced70887166612ced5b537fb294dcecb357",
    fxToken: {
      symbol: "MOCK_FX_TOKEN" as unknown as FxTokenSymbol,
      address: ethers.Wallet.createRandom().address,
      decimals: 18
    },
    debt,
    collateral
  };
};

export const createMockVaultDataFromMockCollaterals = (
  debt: ethers.BigNumber,
  collateral: Collateral[],
  amounts: ethers.BigNumber[]
) => {
  const vaultCollaterals = collateral.map((c, i) =>
    createVaultCollateralFromCollateral(c, amounts[i])
  );

  return createMockVaultData(debt, vaultCollaterals);
};

export const createMockProtocolParams = (
  overrides: Partial<ProtocolParameters> = {}
): ProtocolParameters => {
  return {
    mintFee: ethers.constants.Zero,
    burnFee: ethers.constants.Zero,
    withdrawFee: ethers.constants.Zero,
    depositFee: ethers.constants.Zero,
    minimumMintingAmountAsEth: ethers.constants.Zero,
    ...overrides
  };
};

const randomId = () => Math.floor(Math.random() * 100);

