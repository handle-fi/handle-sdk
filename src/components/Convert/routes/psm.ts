import { BigNumber, ethers, providers, Signer } from "ethers";
import { config, HlpConfig, Network } from "../../..";
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
  const hpsmAddress = config.protocol.arbitrum.protocol.hPsm;
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
  const { fromToken, toToken, provider, network, fromAmount } = input;
  const hpsmAddress = config.protocol.arbitrum.protocol.hPsm;
  if (!hpsmAddress) {
    throw new Error(`No HPSM for network ${network}`);
  }
  if (!provider) {
    throw new Error(`Provider missing. Provider must be given for HPSM quote.`);
  }
  if (!transactionFeeCache[network]) {
    const hpsm = HPSM__factory.connect(hpsmAddress, provider);
    transactionFeeCache[network] = await hpsm.transactionFee();
  }
  // convert transaction fee to basis points
  const transactionFeeBasisPoints = transactionFeeCache[network]!.mul(
    HlpConfig.BASIS_POINTS_DIVISOR
  ).div(TRANSACTION_FEE_UNIT);

  const isDeposit = await isTokenPegged(toToken.address, fromToken.address, provider, network);

  const buyAmount = transformDecimals(fromAmount, fromToken.decimals, toToken.decimals);

  const quote: Quote = {
    allowanceTarget: isDeposit ? hpsmAddress : null,
    sellAmount: fromAmount.toString(),
    buyAmount: buyAmount.toString(),
    gas: config.convert.gasEstimates.hPsm,
    feeBasisPoints: +transactionFeeBasisPoints
  };

  return quote;
};

export const psmTransactionHandler = async (
  input: ConvertTransactionInput
): Promise<ethers.PopulatedTransaction> => {
  const { network, signer, fromToken, toToken, sellAmount } = input;
  const hpsmAddress = config.protocol.arbitrum.protocol.hPsm;
  if (!hpsmAddress) {
    throw new Error(`No HPSM for network ${network}`);
  }
  const hpsm = HPSM__factory.connect(hpsmAddress, signer);
  const [isWithdraw, isDeposit] = await Promise.all([
    isTokenPegged(fromToken.address, toToken.address, signer, network),
    isTokenPegged(toToken.address, fromToken.address, signer, network)
  ]);
  if (isDeposit) {
    return hpsm.populateTransaction.deposit(toToken.address, fromToken.address, sellAmount);
  }
  if (isWithdraw) {
    return hpsm.populateTransaction.withdraw(fromToken.address, toToken.address, sellAmount);
  }
  throw new Error(`There is no peg between ${fromToken} and ${toToken}`);
};

export default {
  weight: psmWeight,
  quote: psmQuoteHandler,
  transaction: psmTransactionHandler
};
