import { ethers } from "ethers";
import { SECONDS_IN_A_YEAR_BN } from "./constants";
import { BENTOBOX_ADDRESS } from "@sushiswap/core-sdk";
import { Provider as MultiCallProvider } from "ethers-multicall";
import { createMultiCallContract, callMulticallObject } from "./contract-utils";
import { SushiBento, SushiKashi } from "../contracts";
import sushiKashiAbi from "../abis/sushi/SushiKashi.json";
import sushiBentoAbi from "../abis/sushi/SushiBento.json";
import { Promisified, Token } from "../types/general";
import { FxTokenSymbol, SingleCollateralVaultNetwork } from "..";
import config, { KashiPoolConfig } from "../config";
import { SingleCollateralVaultData } from "../types/vaults";

export type KashiPair = {
  account: string;
  collateralAsset: Token<string>;
  borrowAsset: Token<FxTokenSymbol>;
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

type GetKashiPairArgs = {
  account: string;
  network: SingleCollateralVaultNetwork;
  pool: KashiPoolConfig;
};

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

export const getKashiPair = async (
  args: GetKashiPairArgs,
  signer: ethers.Signer
): Promise<SingleCollateralVaultData> => {
  const chainId = config.networkNameToId[args.network];
  const bentoBoxAddress = BENTOBOX_ADDRESS[chainId];

  const multiCallProvider = new MultiCallProvider(signer.provider!);
  await multiCallProvider.init();
  const kashiMultiCall = createMultiCallContract<SushiKashi>(args.pool.address, sushiKashiAbi);
  const bentoBoxMutiCall = createMultiCallContract<SushiBento>(bentoBoxAddress, sushiBentoAbi);

  const kashiCalls: Promisified<KashiMulticallRequestAndResponse> = {
    accureInfo: kashiMultiCall.accrueInfo(),
    totalAsset: kashiMultiCall.totalAsset(),
    totalBorrow: kashiMultiCall.totalBorrow(),
    totalCollateralShare: kashiMultiCall.totalCollateralShare(),
    userBorrowPart: kashiMultiCall.userBorrowPart(args.account),
    userCollateralShare: kashiMultiCall.userCollateralShare(args.account),
    exchangeRate: kashiMultiCall.exchangeRate(),
    collateralTotals: bentoBoxMutiCall.totals(args.pool.collateral.address)
  };

  const {
    accureInfo,
    totalAsset,
    totalBorrow,
    totalCollateralShare,
    userBorrowPart,
    userCollateralShare,
    exchangeRate,
    collateralTotals
  } = await callMulticallObject<KashiMulticallRequestAndResponse>(kashiCalls, multiCallProvider);

  const interestPerYear = accureInfo.interestPerSecond.mul(SECONDS_IN_A_YEAR_BN);

  const userCollateralAmount = userCollateralShare
    .mul(collateralTotals.elastic)
    .div(collateralTotals.base);

  const currentBorrowAmount = accrue(totalBorrow.elastic, accureInfo, true);

  const debt = totalBorrow.base.isZero()
    ? userBorrowPart?.mul(currentBorrowAmount)
    : userBorrowPart?.mul(currentBorrowAmount).div(totalBorrow.base);

  return {
    account: args.account,
    debt,
    collateral: {
      ...args.pool.collateral,
      amount: userCollateralAmount
    },
    interestPerYear,
    currentBorrowAmount,
    availableToBorrow: totalAsset.elastic,
    totalCollateralShare,
    exchangeRate
  };
};
