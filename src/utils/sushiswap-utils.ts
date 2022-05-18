import { ethers } from "ethers";
import { SECONDS_IN_A_YEAR_BN } from "../constants";
import { BENTOBOX_ADDRESS } from "@sushiswap/core-sdk";
import { createMultiCallContract } from "./contract-utils";
import { SushiBento, SushiKashi } from "../contracts";
import sushiKashiAbi from "../abis/sushi/SushiKashi.json";
import sushiBentoAbi from "../abis/sushi/SushiBento.json";
import { Promisified } from "../types/general";
import { TokenInfo } from "@uniswap/token-lists";

import { KashiPoolConfig } from "../config";
import { SingleCollateralVaultData } from "../types/vaults";
import { FxTokenPriced } from "../types/fxTokens";

export type KashiPair = {
  account: string;
  collateralAsset: TokenInfo;
  borrowAsset: FxTokenPriced;
  interestPerYear: ethers.BigNumber;
  availableToBorrow: ethers.BigNumber;
  currentBorrowAmount: ethers.BigNumber;
  totalCollateralShare: ethers.BigNumber;
  exchangeRate: ethers.BigNumber;
  accountSpecific: {
    borrowedAmount: ethers.BigNumber;
    collateralAmount: ethers.BigNumber;
  };
};

export type AccureInfo = {
  interestPerSecond: ethers.BigNumber;
  lastAccrued: ethers.BigNumber;
};

export type ElasticBase = { elastic: ethers.BigNumber; base: ethers.BigNumber };

type KashiMulticallRequestAndResponse = {
  accureInfo: AccureInfo;
  totalAsset: ElasticBase;
  totalBorrow: ElasticBase;
  totalCollateralShare: ethers.BigNumber;
  userBorrowPart: ethers.BigNumber;
  userCollateralShare: ethers.BigNumber;
  exchangeRate: ethers.BigNumber;
  collateralTotals: ElasticBase;
};

const e10 = (exponent: ethers.BigNumber | number | string): ethers.BigNumber => {
  return ethers.BigNumber.from("10").pow(ethers.BigNumber.from(exponent));
};

const accrue = (
  amount: ethers.BigNumber,
  accrueInfo: AccureInfo,
  includePrincipal = false
): ethers.BigNumber => {
  const elapsedSeconds = ethers.BigNumber.from(Date.now()).div("1000").sub(accrueInfo.lastAccrued);

  return amount
    .mul(accrueInfo.interestPerSecond)
    .mul(elapsedSeconds)
    .div(e10(18))
    .add(includePrincipal ? amount : ethers.constants.Zero);
};

export const getKashiPoolMulticall = (
  account: string,
  pool: KashiPoolConfig,
  chainId: number
): Promisified<KashiMulticallRequestAndResponse> => {
  const bentoBoxAddress = BENTOBOX_ADDRESS[chainId];

  const kashiMultiCall = createMultiCallContract<SushiKashi>(pool.address, sushiKashiAbi);
  const bentoBoxMutiCall = createMultiCallContract<SushiBento>(bentoBoxAddress, sushiBentoAbi);

  const kashiCalls: Promisified<KashiMulticallRequestAndResponse> = {
    accureInfo: kashiMultiCall.accrueInfo(),
    totalAsset: kashiMultiCall.totalAsset(),
    totalBorrow: kashiMultiCall.totalBorrow(),
    totalCollateralShare: kashiMultiCall.totalCollateralShare(),
    userBorrowPart: kashiMultiCall.userBorrowPart(account),
    userCollateralShare: kashiMultiCall.userCollateralShare(account),
    exchangeRate: kashiMultiCall.exchangeRate(),
    collateralTotals: bentoBoxMutiCall.totals(pool.collateral.address)
  };

  return kashiCalls;
};

export const kashiMulticallResultToSingleCollateralVaultData = (
  account: string,
  config: KashiPoolConfig,
  data: KashiMulticallRequestAndResponse
): SingleCollateralVaultData => {
  const {
    accureInfo,
    totalAsset,
    totalBorrow,
    totalCollateralShare,
    userBorrowPart,
    userCollateralShare,
    exchangeRate,
    collateralTotals
  } = data;

  const interestPerYear = accureInfo.interestPerSecond.mul(SECONDS_IN_A_YEAR_BN);

  const userCollateralAmount = userCollateralShare
    .mul(collateralTotals.elastic)
    .div(collateralTotals.base);

  const currentBorrowAmount = accrue(totalBorrow.elastic, accureInfo, true);

  const debt = totalBorrow.base.isZero()
    ? userBorrowPart?.mul(currentBorrowAmount)
    : userBorrowPart?.mul(currentBorrowAmount).div(totalBorrow.base);

  return {
    account,
    debt,
    collateral: {
      ...config.collateral,
      amount: userCollateralAmount
    },
    interestPerYear,
    currentBorrowAmount,
    availableToBorrow: totalAsset.elastic,
    totalCollateralShare,
    exchangeRate
  };
};
