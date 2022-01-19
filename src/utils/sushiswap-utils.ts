import { ethers } from "ethers";
import { SECONDS_IN_A_YEAR_BN } from "./constants";
import { Provider as MultiCallProvider } from "ethers-multicall";
import { createMultiCallContract, callMulticallObject } from "./contract-utils";
import { ERC20, SushiBento, SushiBoringHelpers, SushiKashi } from "../contracts";
import sushiKashiAbi from "../abis/sushi/SushiKashi.json";
import sushiBentoAbi from "../abis/sushi/SushiBento.json";
import sushiBoringHelpersAbi from "../abis/sushi/SushiBoringHelpers.json";
import ERC20Abi from "../abis/ERC20.json";
import { Promisified } from "../types/general";

export type KashiPairAsset = {
  address: string;
  symbol: string;
  decimals: number;
};

export type KashiCollateralAsset = KashiPairAsset & {
  balanceData: BoringHelpersBalance | undefined;
};

export type KashiPair = {
  address: string;
  collateralAsset: KashiCollateralAsset;
  borrowAsset: KashiPairAsset;
  interestPerYear: ethers.BigNumber;
  currentBorrowAmount: ethers.BigNumber;
  totalCollateralShare: ethers.BigNumber;
  accountSpecific:
    | {
        borrowedAmount: ethers.BigNumber;
        collateralAmount: ethers.BigNumber;
      }
    | undefined;
};

export type AccureInfo = {
  interestPerSecond: ethers.BigNumber;
  lastAccrued: ethers.BigNumber;
};

export type ElasticBase = { elastic: ethers.BigNumber; base: ethers.BigNumber };

type BoringHelpersBalance = {
  totalSupply: ethers.BigNumber;
  balance: ethers.BigNumber;
  bentoBalance: ethers.BigNumber;
  bentoAmount: ethers.BigNumber;
  bentoShare: ethers.BigNumber;
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

type GetKashiPairArgs = {
  account: string;
  boringHelpersAddress: string;
  poolAddress: string;
};

type KashiMulticallRequestAndResponse = {
  collateralAddress: string;
  borrowAssetAddress: string;
  accureInfo: AccureInfo;
  totalBorrow: ElasticBase;
  totalCollateralShare: ethers.BigNumber;
  bentoBoxAddress: string;
  userBorrowPart: ethers.BigNumber;
  userCollateralShare: ethers.BigNumber;
};

type TokenMulticallRequestAndResponse = {
  collateralTotals: ElasticBase;
  collateralAssetSymbol: string;
  collateralAssetDecimals: number;
  borrowAssetSymbol: string;
  borrowAssetDecimals: number;
  balances: BoringHelpersBalance[];
};

export const getKashiPair = async (
  args: GetKashiPairArgs,
  signer: ethers.Signer
): Promise<KashiPair> => {
  const multiCallProvider = new MultiCallProvider(signer.provider!);
  await multiCallProvider.init();
  const kashiMultiCall = createMultiCallContract<SushiKashi>(args.poolAddress, sushiKashiAbi);

  const kashiCalls: Promisified<KashiMulticallRequestAndResponse> = {
    collateralAddress: kashiMultiCall.collateral(),
    borrowAssetAddress: kashiMultiCall.asset(),
    accureInfo: kashiMultiCall.accrueInfo(),
    totalBorrow: kashiMultiCall.totalBorrow(),
    totalCollateralShare: kashiMultiCall.totalCollateralShare(),
    bentoBoxAddress: kashiMultiCall.bentoBox(),
    userBorrowPart: kashiMultiCall.userBorrowPart(args.account),
    userCollateralShare: kashiMultiCall.userCollateralShare(args.account)
  };

  const {
    collateralAddress,
    borrowAssetAddress,
    accureInfo,
    totalBorrow,
    totalCollateralShare,
    bentoBoxAddress,
    userBorrowPart,
    userCollateralShare
  } = await callMulticallObject<KashiMulticallRequestAndResponse>(kashiCalls, multiCallProvider);

  const collateralAssetMultiCall = createMultiCallContract<ERC20>(collateralAddress, ERC20Abi);
  const borrowAssetMultiCall = createMultiCallContract<ERC20>(borrowAssetAddress, ERC20Abi);
  const bentoBoxMutiCall = createMultiCallContract<SushiBento>(bentoBoxAddress, sushiBentoAbi);
  const boringHelopersMultiCall = createMultiCallContract<SushiBoringHelpers>(
    args.boringHelpersAddress,
    sushiBoringHelpersAbi
  );

  const tokenCalls: Promisified<TokenMulticallRequestAndResponse> = {
    collateralTotals: bentoBoxMutiCall.totals(collateralAddress),
    collateralAssetSymbol: collateralAssetMultiCall.symbol(),
    collateralAssetDecimals: collateralAssetMultiCall.decimals(),
    borrowAssetSymbol: borrowAssetMultiCall.symbol(),
    borrowAssetDecimals: borrowAssetMultiCall.decimals(),
    balances: boringHelopersMultiCall.getBalances(args.account, [collateralAddress])
  };

  const {
    collateralTotals,
    collateralAssetSymbol,
    collateralAssetDecimals,
    borrowAssetSymbol,
    borrowAssetDecimals,
    balances
  } = await callMulticallObject<TokenMulticallRequestAndResponse>(tokenCalls, multiCallProvider);

  const interestPerYear = accureInfo.interestPerSecond.mul(SECONDS_IN_A_YEAR_BN);

  const userCollateralAmount = userCollateralShare
    ? userCollateralShare.mul(collateralTotals.elastic).div(collateralTotals.base)
    : undefined;

  const currentBorrowAmount = accrue(totalBorrow.elastic, accureInfo, true);

  const currentUsersBorrowAmount = userBorrowPart?.mul(currentBorrowAmount).div(totalBorrow.base);

  return {
    address: args.poolAddress,
    collateralAsset: {
      address: collateralAddress,
      symbol: collateralAssetSymbol,
      decimals: collateralAssetDecimals,
      balanceData: balances ? balances[0] : undefined
    },
    borrowAsset: {
      address: borrowAssetAddress,
      symbol: borrowAssetSymbol,
      decimals: borrowAssetDecimals
    },
    interestPerYear,
    currentBorrowAmount,
    totalCollateralShare,
    accountSpecific: args.account
      ? {
          borrowedAmount: currentUsersBorrowAmount!,
          collateralAmount: userCollateralAmount!
        }
      : undefined
  };
};
