import { BigNumber, ethers, providers, Signer } from "ethers";
import { HlpConfig, Network } from "../../..";
import { PSM_GAS_LIMIT } from "../../../config/hlp";
import { HPSM__factory } from "../../../contracts";
import { transformDecimals } from "../../../utils/general-utils";
import { ConvertQuoteInput, ConvertTransactionInput, Quote } from "../Convert";
import { PSM_WEIGHT, WeightInput } from "./weights";

const transactionFeeCache: Record<Network, BigNumber | null> = {
  arbitrum: null,
  ethereum: null,
  polygon: null
};

const TRANSACTION_FEE_UNIT = ethers.utils.parseEther("1");

const pegCache: Record<Network, Record<string, boolean>> = {
  arbitrum: {},
  ethereum: {},
  polygon: {}
};

export const isTokenPegged = async (
  fxToken: string,
  pegToken: string,
  provider: Signer | providers.Provider,
  network: Network
): Promise<boolean> => {
  const cacheKey = `${fxToken}-${pegToken}`;
  if (pegCache[network][cacheKey] !== undefined) {
    return pegCache[network][cacheKey];
  }
  const hpsmAddress = HlpConfig.HLP_CONTRACTS[network]?.HPSM;
  if (!hpsmAddress) {
    return false;
  }
  const hpsm = HPSM__factory.connect(hpsmAddress, provider);
  const isPegged = await hpsm.isFxTokenPegged(fxToken, pegToken);
  pegCache[network][cacheKey] = isPegged;
  return isPegged;
};

export const psmWeight = async (input: WeightInput) => {
  const { fromToken, toToken, signerOrProvider, network } = input;

  if (!signerOrProvider) return 0;

  const [isWithdraw, isDeposit] = await Promise.all([
    isTokenPegged(fromToken.address, toToken.address, signerOrProvider, network),
    isTokenPegged(toToken.address, fromToken.address, signerOrProvider, network)
  ]);

  return isWithdraw || isDeposit ? PSM_WEIGHT : 0;
};

export const psmQuoteHandler = async (input: ConvertQuoteInput): Promise<Quote> => {
  const hpsmAddress = HlpConfig.HLP_CONTRACTS[input.network]?.HPSM;
  if (!hpsmAddress) {
    throw new Error(`No HPSM for network ${input.network}`);
  }
  if (!input.provider) {
    throw new Error(`Provider missing. Provider must be given for HPSM quote.`);
  }
  if (!transactionFeeCache[input.network]) {
    const hpsm = HPSM__factory.connect(hpsmAddress, input.provider);
    transactionFeeCache[input.network] = await hpsm.transactionFee();
  }
  // convert transaction fee to basis points
  const transactionFeeBasisPoints = transactionFeeCache[input.network]!.mul(
    HlpConfig.BASIS_POINTS_DIVISOR
  ).div(TRANSACTION_FEE_UNIT);

  const buyAmount = transformDecimals(
    input.fromAmount,
    input.fromToken.decimals,
    input.toToken.decimals
  );

  const quote: Quote = {
    allowanceTarget: hpsmAddress,
    sellAmount: input.fromAmount.toString(),
    buyAmount: buyAmount.toString(),
    gas: PSM_GAS_LIMIT,
    feeBasisPoints: +transactionFeeBasisPoints
  };

  return quote;
};

export const psmTransactionHandler = async (
  input: ConvertTransactionInput
): Promise<ethers.PopulatedTransaction> => {
  const { network, signer, fromToken, toToken, buyAmount } = input;
  const hpsmAddress = HlpConfig.HLP_CONTRACTS[network]?.HPSM;
  if (!hpsmAddress) {
    throw new Error(`No HPSM for network ${network}`);
  }
  const hpsm = HPSM__factory.connect(hpsmAddress, signer);
  const [isWithdraw, isDeposit] = await Promise.all([
    isTokenPegged(fromToken.address, toToken.address, signer, network),
    isTokenPegged(toToken.address, fromToken.address, signer, network)
  ]);
  if (isDeposit) {
    return hpsm.populateTransaction.deposit(toToken.address, fromToken.address, buyAmount);
  }
  if (isWithdraw) {
    return hpsm.populateTransaction.withdraw(fromToken.address, toToken.address, buyAmount);
  }
  throw new Error(`There is no peg between ${fromToken} and ${toToken}`);
};

export default {
  weight: psmWeight,
  quote: psmQuoteHandler,
  transaction: psmTransactionHandler
};
