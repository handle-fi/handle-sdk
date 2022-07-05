import { BigNumber, ethers } from "ethers";
import { config, HlpConfig, Network } from "../../..";
import { HPSM__factory } from "../../../contracts";
import { isTokenPegged } from "../../../utils/convert-utils";
import { transformDecimals } from "../../../utils/general-utils";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { PSM_WEIGHT, WeightInput } from "./weights";

const transactionFeeCache: Record<Network, BigNumber | null> = {
  arbitrum: null,
  ethereum: null,
  polygon: null
};

const TRANSACTION_FEE_UNIT = ethers.utils.parseEther("1");

export const psmWeight = async (input: WeightInput) => {
  const { fromToken, toToken, network } = input;

  const [isWithdraw, isDeposit] = await Promise.all([
    isTokenPegged(fromToken.address, toToken.address, network),
    isTokenPegged(toToken.address, fromToken.address, network)
  ]);

  return isWithdraw || isDeposit ? PSM_WEIGHT : 0;
};

export const psmQuoteHandler = async (input: ConvertQuoteRouteArgs): Promise<Quote> => {
  const { fromToken, toToken, signerOrProvider, network, sellAmount: fromAmount } = input;
  const hpsmAddress = config.protocol[network]?.protocol.hpsm;
  if (!hpsmAddress) {
    throw new Error(`No HPSM for network ${network}`);
  }
  if (!signerOrProvider) {
    throw new Error(`Provider missing. Provider must be given for HPSM quote.`);
  }
  if (!transactionFeeCache[network]) {
    const hpsm = HPSM__factory.connect(hpsmAddress, signerOrProvider);
    transactionFeeCache[network] = await hpsm.transactionFee();
  }
  // convert transaction fee to basis points
  const transactionFeeBasisPoints = transactionFeeCache[network]!.mul(
    HlpConfig.BASIS_POINTS_DIVISOR
  ).div(TRANSACTION_FEE_UNIT);

  const isDeposit = await isTokenPegged(toToken.address, fromToken.address, network);

  const buyAmount = transformDecimals(fromAmount, fromToken.decimals, toToken.decimals);

  const quote: Quote = {
    allowanceTarget: isDeposit ? hpsmAddress : null,
    sellAmount: fromAmount.toString(),
    buyAmount: buyAmount.toString(),
    gas: config.convert.gasEstimates.hpsm,
    feeBasisPoints: +transactionFeeBasisPoints,
    feeChargedBeforeConvert: false
  };

  return quote;
};

export const psmTransactionHandler = async (
  input: ConvertTransactionRouteArgs
): Promise<ethers.PopulatedTransaction> => {
  const { network, signer, fromToken, toToken, sellAmount } = input;
  const hpsmAddress = config.protocol[network]?.protocol.hpsm;
  if (!hpsmAddress) {
    throw new Error(`No HPSM for network ${network}`);
  }
  const hpsm = HPSM__factory.connect(hpsmAddress, signer);
  const [isWithdraw, isDeposit] = await Promise.all([
    isTokenPegged(fromToken.address, toToken.address, network),
    isTokenPegged(toToken.address, fromToken.address, network)
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
