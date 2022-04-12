import { ethers } from "ethers";
import { ProtocolParameters } from "../components/Protocol";
import { Collateral, CollateralSymbol } from "../types/collaterals";
import { FxToken } from "../types/fxTokens";
import { SingleCollateralVaultSymbol, VaultCollateral } from "../types/vaults";
import {
  VaultData,
  Vault,
  SingleCollateralVault,
  SingleCollateralVaultData
} from "../types/vaults";
import sdkConfig from "../config";
import { config } from "..";

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

export const calculateMinimumMintingRatio = (vault: VaultData, collaterals: Collateral[]) => {
  const shares = calculateCollateralShares(vault, collaterals);

  const ratio = vault.collateral.reduce((sum, vaultCollateral) => {
    const collateral = getCollateral(vaultCollateral.symbol, collaterals);
    const collateralShare = shares.find((s) => s.symbol === vaultCollateral.symbol)!;

    return sum.add(collateral.mintCR.mul(100).mul(collateralShare.share));
  }, ethers.constants.Zero);

  return ratio.div(10000);
};

export const calculateInterestRate = (vault: VaultData, collaterals: Collateral[]) => {
  const shares = calculateCollateralShares(vault, collaterals);

  const interestRate = vault.collateral.reduce((sum, vaultCollateral) => {
    const collateral = getCollateral(vaultCollateral.symbol, collaterals);
    const collateralShare = shares.find((s) => s.symbol === vaultCollateral.symbol)!;

    return sum.add(collateral.interestRate.mul(collateralShare.share));
  }, ethers.constants.Zero);

  // we return interest as 18 decimals where 1 = 100%;
  return interestRate.div("1000");
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

export const calculateCollateralAsFxToken = (
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

  return vault.debt.gt(0) && debtAsEth.gt(0)
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
  const minimumRatio = calculateMinimumMintingRatio(vault, collaterals);
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
  const minimumRatio = calculateMinimumMintingRatio(vault, collaterals);

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
  protocolParameters: ProtocolParameters,
  collaterals: Collateral[],
  fxToken: FxToken
) => {
  const collateralAsEth = calculateCollateralAsEth(vault, collaterals);
  const minimumRatio = calculateMinimumMintingRatio(vault, collaterals);

  const withoutFee =
    collateralAsEth.gt(0) && minimumRatio.gt(0)
      ? collateralAsEth
          .mul(ethers.constants.WeiPerEther)
          .mul(ethers.constants.WeiPerEther)
          .div(fxToken.price)
          .div(minimumRatio)
          .sub(vault.debt)
      : ethers.constants.Zero;

  const fee = withoutFee.mul(protocolParameters.mintFee).div(ethers.constants.WeiPerEther);

  return withoutFee.gt(0)
    ? withoutFee.mul(ethers.constants.WeiPerEther).div(withoutFee.add(fee))
    : ethers.constants.Zero;
};

const calculateMinimumDebt = (protocolParamters: ProtocolParameters, fxToken: FxToken) => {
  const fxAmount = protocolParamters.minimumMintingAmountAsEth
    .mul(ethers.constants.WeiPerEther)
    .div(fxToken.price);
  // Round up to the nearest 100.
  const roundBy = ethers.utils.parseEther("100");
  return fxAmount.add(roundBy).sub(1).div(roundBy).mul(roundBy);
};

const calculateTokensRequiredForCrIncrease = (
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

export const createVault = (
  vault: VaultData,
  protocolParamters: ProtocolParameters,
  fxToken: FxToken,
  collaterals: Collateral[]
): Vault => {
  const collateralAsEth = calculateCollateralAsEth(vault, collaterals);
  const debtAsEth = calculateDebtAsEth(vault, fxToken);
  const collateralAsFxToken = calculateCollateralAsFxToken(vault, collaterals, fxToken);
  const collateralRatio = calculateCollateralRatio(vault, collaterals, fxToken);
  const availableToMint = calculateAvailableToMint(vault, protocolParamters, collaterals, fxToken);
  const utilisation = calculateUtilisation(vault, collaterals, fxToken);
  const minimumMintingRatio = calculateMinimumMintingRatio(vault, collaterals);
  const { isRedeemable, redeemableTokens } = calculateReedmable(vault, collaterals, fxToken);
  const minimumDebt = calculateMinimumDebt(protocolParamters, fxToken);
  const interestRate = calculateInterestRate(vault, collaterals);

  return {
    ...vault,
    collateralAsEth,
    collateralAsFxToken,
    debtAsEth,
    collateralRatio,
    isRedeemable,
    redeemableTokens,
    utilisation,
    availableToMint,
    minimumMintingRatio,
    minimumDebt,
    interestRate
  };
};

export const createSingleCollateralVault = (
  vaultData: SingleCollateralVaultData,
  fxToken: FxToken
): SingleCollateralVault => {
  const debtAsEth = fxToken.price.mul(vaultData.debt).div(ethers.constants.WeiPerEther);

  const collateralAsEth = vaultData.collateral.amount
    .mul(fxToken.price)
    .div(vaultData.exchangeRate);

  const collateralRatio = vaultData.debt.gt(0)
    ? collateralAsEth.mul(ethers.constants.WeiPerEther).div(debtAsEth)
    : ethers.constants.Zero;

  const availableToMint =
    collateralAsEth.gt(0) && collateralAsEth.gt(0)
      ? collateralAsEth
          .mul(ethers.constants.WeiPerEther)
          .mul(ethers.constants.WeiPerEther)
          .div(fxToken.price)
          .div(sdkConfig.singleCollateralVaultParams.minimumMintingRatio)
          .sub(vaultData.debt)
      : ethers.constants.Zero;

  const utilisation = !collateralRatio.isZero()
    ? sdkConfig.singleCollateralVaultParams.minimumMintingRatio
        .mul(ethers.constants.WeiPerEther)
        .div(collateralRatio)
        .mul(ethers.constants.WeiPerEther)
    : ethers.constants.Zero;

  const collateralAsFxToken = collateralAsEth.mul(ethers.constants.WeiPerEther).div(fxToken.price);

  return {
    ...vaultData,
    vaultSymbol: `${fxToken.symbol}-${vaultData.collateral.symbol}` as SingleCollateralVaultSymbol,
    fxToken,
    debtAsEth,
    collateralAsFxToken,
    collateralAsEth,
    collateralRatio,
    availableToMint,
    minimumMintingRatio: sdkConfig.singleCollateralVaultParams.minimumMintingRatio,
    utilisation,
    minimumDebt: ethers.constants.WeiPerEther,
    interestRate: vaultData.interestPerYear,
    liquidationPrice: calculateSingleCollateralVaultLiquidationPrice(
      vaultData.debt,
      vaultData.collateral,
      collateralAsFxToken,
      config.singleCollateralVaultParams.minimumCollateralRatio
    )
  };
};

const calculateWithdrawableCollateral = (vault: Vault, collateral: Collateral) => {
  const collateralTypeRatioPrecision = "100";

  const vaultCollateral = vault.collateral.find((c) => c.symbol === collateral.symbol);

  if (!vaultCollateral) {
    throw new Error("Couldnt find collateral by symbol");
  }

  const collateralValueAsEth = vaultCollateral.amount
    .mul(collateral.price)
    .div(ethers.BigNumber.from("10").pow(collateral.decimals));

  let a = vault.debtAsEth.mul(
    ethers.BigNumber.from("-4")
      .mul(vault.collateralAsEth)
      .mul(collateral.mintCR)
      .div(collateralTypeRatioPrecision)
      .add(
        ethers.BigNumber.from("4")
          .mul(vault.collateralAsEth)
          .mul(vault.minimumMintingRatio)
          .div(ethers.constants.WeiPerEther)
      )
      .add(
        vault.debtAsEth
          .mul(collateral.mintCR.mul(collateral.mintCR))
          .div(collateralTypeRatioPrecision)
          .div(collateralTypeRatioPrecision)
      )
  );
  // Use js' BigInt to calculate sqrt since ethers.BigNumber does not support it.
  if (a.lt(0)) a = a.mul("-1");
  const aBN = sqrt(BigInt(a.toString())).toString();
  const aSqrt = ethers.BigNumber.from(aBN.toString());
  const withdrawEth = aSqrt
    .div("-2")
    .add(vault.collateralAsEth)
    .sub(vault.debtAsEth.mul(collateral.mintCR).div(collateralTypeRatioPrecision).div("2"));
  const max = withdrawEth.mul(ethers.constants.WeiPerEther).div(collateral.price);
  const maxBalance = collateralValueAsEth.mul(ethers.constants.WeiPerEther).div(collateral.price);
  const result = max.gt(maxBalance) ? maxBalance : max;
  return result.gt(0) ? result : ethers.BigNumber.from(0);
};

// todo - update this function to work with multiple collateral vaults.
// See branch "HP-1592-Lorenzo" for partial implementation.
// I, Anthony Hinchliff, swear to have this done before my final day.
const calculateAdditionalCollateralRequired = (
  vault: Vault,
  collateralSymbol: CollateralSymbol,
  collaterals: Collateral[],
  fxToken: FxToken,
  _protocolParams: ProtocolParameters
): ethers.BigNumber => {
  const collateral = collaterals.find((c) => c.symbol === collateralSymbol);

  if (!collateral) {
    throw new Error("Couldnt find collateral by symbol");
  }

  const valueOfCollateral = calculateCollateralAsFxToken(vault, collaterals, fxToken);

  const valueOfCollateralAtMinimumMintingRatio = vault.minimumMintingRatio.isZero()
    ? vault.debt.mul(collateral.mintCR).div(100)
    : vault.debt.mul(vault.minimumMintingRatio).div(ethers.constants.WeiPerEther);

  if (valueOfCollateral.gte(valueOfCollateralAtMinimumMintingRatio)) {
    return ethers.constants.Zero;
  }

  const valueDifference = valueOfCollateralAtMinimumMintingRatio.sub(valueOfCollateral);

  const valueDifferenceInEth = valueDifference.mul(fxToken.price).div(ethers.constants.WeiPerEther);

  return valueDifferenceInEth.mul(collateral.price).div(ethers.constants.WeiPerEther);
};

export const calculateSingleCollateralVaultLiquidationPrice = (
  debt: ethers.BigNumber,
  collateral: VaultCollateral<string>,
  collateralValueInFx: ethers.BigNumber,
  minCollateralRatio: ethers.BigNumber
) => {
  if (debt.lte(0) || collateralValueInFx.lte(0)) {
    return ethers.constants.Zero;
  }

  const collateralValueWhenLiquidated = debt
    .mul(minCollateralRatio)
    .div(ethers.constants.WeiPerEther);

  return collateralValueWhenLiquidated
    .mul(ethers.BigNumber.from("10").pow(collateral.decimals))
    .div(collateral.amount);
};

const calculateLiquidationPriceOfVaultWithOneCollateral = (
  vault: Vault,
  collateral: Collateral
): ethers.BigNumber => {
  if (vault.debt.lte(0)) {
    return ethers.constants.Zero;
  }

  const collateralsWithBalance = vault.collateral.filter((c) => c.amount.gt(0));

  // confirm vault only has one collateral type
  if (collateralsWithBalance.length > 1) {
    console.error("liquidation price not implemented for vaults with multiple collateral");
    return ethers.constants.Zero;
  }

  const vaultCollateral = collateralsWithBalance[0];

  if (!vaultCollateral) {
    return ethers.constants.Zero;
  }

  const collateralLiquidationRatio = collateral.mintCR.mul(80).div(100);
  const minLiquidationRatio = ethers.BigNumber.from("110"); // from the contracts
  const liquidationRatio = collateralLiquidationRatio.gte(minLiquidationRatio)
    ? collateralLiquidationRatio
    : minLiquidationRatio;
  const collateralValueWhenLiquidated = vault.debt.mul(liquidationRatio).div("100");

  return collateralValueWhenLiquidated
    .mul(ethers.BigNumber.from("10").pow(collateral.decimals))
    .div(vaultCollateral.amount);
};

export const vaultUtils = {
  calculateWithdrawableCollateral,
  calculateAdditionalCollateralRequired,
  calculateLiquidationPriceOfVaultWithOneCollateral
};

const sqrt = (value: BigInt) => {
  if (value < 0n) throw new Error("negative value passed to sqrt");
  if (value < 2n) return value;
  const newtonIteration = (n: any, x0: any): any => {
    const x1 = (n / x0 + x0) >> 1n;
    if (x0 === x1 || x0 === x1 - 1n) {
      return x0;
    }
    return newtonIteration(n, x1);
  };
  return newtonIteration(value, 1n);
};

