import { ethers } from "ethers";
import { ProtocolParameters } from "../components/Protocol";
import { Collateral, CollateralSymbol } from "../types/collaterals";
import { FxToken } from "../types/fxTokens";
import { VaultData, Vault } from "../types/vaults";

export const calculateCollateralAsEth = (
  vault: VaultData,
  collaterals: Collateral[]
): ethers.BigNumber => {
  return vault.collateral.reduce((sum, vaultCollateral) => {
    const collateral = getCollateral(vaultCollateral.symbol, collaterals);

    return sum.add(
      vaultCollateral.amount
        .mul(collateral.price)
        .div(ethers.BigNumber.from("10").pow(collateral.decimals))
    );
  }, ethers.constants.Zero);
};

export const calculateMinimumRatio = (vault: VaultData, collaterals: Collateral[]) => {
  const shares = calculateCollateralShares(vault, collaterals);

  const ratio = vault.collateral.reduce((sum, vaultCollateral) => {
    const collateral = getCollateral(vaultCollateral.symbol, collaterals);
    const collateralShare = shares.find((s) => s.symbol === vaultCollateral.symbol)!;

    return sum.add(collateral.mintCR.mul(100).mul(collateralShare.share));
  }, ethers.constants.Zero);

  return ratio.div(10000);
};

export const calculateLiquidationFee = (
  vault: VaultData,
  collaterals: Collateral[]
): ethers.BigNumber => {
  const shares = calculateCollateralShares(vault, collaterals);

  const fee = vault.collateral.reduce((sum, vaultCollateral) => {
    const collateral = getCollateral(vaultCollateral.symbol, collaterals);
    const collateralShare = shares.find((s) => s.symbol === vaultCollateral.symbol)!;

    return sum.add(collateral.liquidationFee.mul(collateralShare.share));
  }, ethers.constants.Zero);

  return fee.div(10000);
};

export const calculateCollateralShares = (
  vault: VaultData,
  collaterals: Collateral[]
): { symbol: CollateralSymbol; share: ethers.BigNumber }[] => {
  const totalCollateralBalanceAsEth = calculateCollateralAsEth(vault, collaterals);

  if (totalCollateralBalanceAsEth.isZero()) {
    return vault.collateral.map((c) => ({
      symbol: c.symbol,
      share: ethers.constants.Zero
    }));
  }

  return vault.collateral.map((vaultCollateral) => {
    const collateral = getCollateral(vaultCollateral.symbol, collaterals);
    const ethValue = vaultCollateral.amount
      .mul(collateral.price)
      .div(ethers.BigNumber.from("10").pow(collateral.decimals));

    return {
      symbol: vaultCollateral.symbol,
      share: ethValue.mul(ethers.constants.WeiPerEther).div(totalCollateralBalanceAsEth)
    };
  });
};

export const calculateDebtAsEth = (vault: VaultData, fxToken: FxToken): ethers.BigNumber =>
  vault.debt.mul(fxToken.price).div(ethers.constants.WeiPerEther);

export const calculateDebtAsFxToken = (
  vault: VaultData,
  collaterals: Collateral[],
  fxToken: FxToken
): ethers.BigNumber => {
  const collateralAsEth = calculateCollateralAsEth(vault, collaterals);
  return collateralAsEth.mul(ethers.constants.WeiPerEther).div(fxToken.price);
};

export const calculateCollateralRatio = (
  vault: VaultData,
  collaterals: Collateral[],
  fxToken: FxToken
): ethers.BigNumber => {
  const collateralAsEth = calculateCollateralAsEth(vault, collaterals);
  const debtAsEth = calculateDebtAsEth(vault, fxToken);

  return vault.debt.gt(0)
    ? collateralAsEth.mul(ethers.constants.WeiPerEther).div(debtAsEth)
    : ethers.constants.Zero;
};

export const calculateReedmable = (
  vault: VaultData,
  collaterals: Collateral[],
  fxToken: FxToken
) => {
  const collateralAsEth = calculateCollateralAsEth(vault, collaterals);
  const collateralRatio = calculateCollateralRatio(vault, collaterals, fxToken);
  const minimumRatio = calculateMinimumRatio(vault, collaterals);
  const debtAsEth = calculateDebtAsEth(vault, fxToken);

  const isRedeemable =
    collateralRatio.lt(minimumRatio) &&
    collateralRatio.gte(ethers.constants.WeiPerEther) &&
    collateralAsEth.gt(ethers.constants.Zero) &&
    vault.debt.gt(ethers.constants.Zero);

  const redeemableAsEth = isRedeemable
    ? calculateTokensRequiredForCrIncrease(
        minimumRatio,
        debtAsEth,
        collateralAsEth,
        ethers.constants.WeiPerEther
      )
    : ethers.constants.Zero;

  const redeemableTokensTemp = isRedeemable
    ? redeemableAsEth.mul(ethers.constants.WeiPerEther).div(fxToken.price)
    : ethers.constants.Zero;

  const redeemableTokens = redeemableTokensTemp.gt(vault.debt) ? vault.debt : redeemableTokensTemp;

  return {
    isRedeemable,
    redeemableTokens
  };
};

const calculateUtilisation = (vault: VaultData, collaterals: Collateral[], fxToken: FxToken) => {
  const collateralAsEth = calculateCollateralAsEth(vault, collaterals);
  const minimumRatio = calculateMinimumRatio(vault, collaterals);

  return minimumRatio.gt(0)
    ? vault.debt
        .mul(ethers.constants.WeiPerEther)
        .mul("100")
        .div(
          collateralAsEth
            .mul(ethers.constants.WeiPerEther)
            .mul(ethers.constants.WeiPerEther)
            .div(fxToken.price)
            .div(minimumRatio)
        )
    : ethers.constants.Zero;
};

const calculateAvailableToMint = (
  vault: VaultData,
  collaterals: Collateral[],
  fxToken: FxToken
) => {
  const collateralAsEth = calculateCollateralAsEth(vault, collaterals);
  const minimumRatio = calculateMinimumRatio(vault, collaterals);

  return collateralAsEth.gt(0) && minimumRatio.gt(0)
    ? collateralAsEth
        .mul(ethers.constants.WeiPerEther)
        .mul(ethers.constants.WeiPerEther)
        .div(fxToken.price)
        .div(minimumRatio)
        .sub(vault.debt)
    : ethers.constants.Zero;
};

const calculateMinimumMintingRatio = (vault: VaultData, collaterals: Collateral[]) =>
  calculateMinimumRatio(vault, collaterals);

const calculateMinimumDebt = (protocolParamters: ProtocolParameters, fxToken: FxToken) => {
  const fxAmount = protocolParamters.minimumMintingAmountAsEth
    .mul(ethers.constants.WeiPerEther)
    .div(fxToken.price);
  // Round up to the nearest 100.
  const roundBy = ethers.utils.parseEther("100");
  return fxAmount.add(roundBy).sub(1).div(roundBy).mul(roundBy);
};

export const createVault = (
  vault: VaultData,
  protocolParamters: ProtocolParameters,
  fxToken: FxToken,
  collaterals: Collateral[]
): Vault => {
  const collateralAsEth = calculateCollateralAsEth(vault, collaterals);
  const debtAsEth = calculateDebtAsEth(vault, fxToken);
  const debtAsFxToken = calculateDebtAsFxToken(vault, collaterals, fxToken);
  const collateralRatio = calculateCollateralRatio(vault, collaterals, fxToken);
  const availableToMint = calculateAvailableToMint(vault, collaterals, fxToken);
  const utilisation = calculateUtilisation(vault, collaterals, fxToken);
  const minimumMintingRatio = calculateMinimumMintingRatio(vault, collaterals);
  const { isRedeemable, redeemableTokens } = calculateReedmable(vault, collaterals, fxToken);
  const minimumDebt = calculateMinimumDebt(protocolParamters, fxToken);

  return {
    ...vault,
    collateralAsEth,
    debtAsFxToken,
    debtAsEth,
    collateralRatio,
    isRedeemable,
    redeemableTokens,
    utilisation,
    availableToMint,
    minimumMintingRatio,
    minimumDebt
  };
};

export const calculateTokensRequiredForCrIncrease = (
  crTarget: ethers.BigNumber,
  debtAsEther: ethers.BigNumber,
  collateralAsEther: ethers.BigNumber,
  collateralReturnRatio: ethers.BigNumber
) => {
  const nominator = crTarget
    .mul(debtAsEther)
    .sub(collateralAsEther.mul(ethers.constants.WeiPerEther));
  const denominator = crTarget.sub(collateralReturnRatio);
  return nominator.div(denominator);
};

const getCollateral = (symbol: CollateralSymbol, collaterals: Collateral[]): Collateral => {
  const collateral = collaterals.find((c) => c.symbol === symbol);

  if (!collateral) {
    throw new Error(
      `collateral in vault's collaterals but missing in collaterals array: ${symbol}`
    );
  }

  return collateral;
};

export const getDeadline = (deadline?: number) => deadline ?? Math.floor(Date.now() / 1000) + 300;
