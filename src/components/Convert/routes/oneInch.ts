import axios from "axios";
import { config } from "../../..";
import { BASIS_POINTS_DIVISOR } from "../../../config/hlp";
import { get1InchBaseUrl } from "../baseApiUrls";
import { ConvertQuoteInput, ConvertTransactionInput, Quote, Transaction } from "../Convert";
import { getApiFeeAsPercentage } from "../getApiFeeAsPercentage";
import { ONE_INCH_WEIGHT, WeightInput } from "./weights";

type OneInchQuoteParams = {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fee: string;
  gasPrice?: string;
};

type OneInchSwapParams = OneInchQuoteParams & {
  fromAddress: string;
  slippage: string;
  referrerAddress: string;
};

const oneInchWeight = async (input: WeightInput) => {
  const { network } = input;
  if (network === "arbitrum") {
    return ONE_INCH_WEIGHT;
  }
  return 0;
};

const oneInchQuoteHandler = async (input: ConvertQuoteInput): Promise<Quote> => {
  const {
    network,
    fromToken: { address: sellToken },
    toToken: { address: buyToken },
    fromAmount,
    gasPrice
  } = input;
  const feePercentage = await getApiFeeAsPercentage(network, sellToken, buyToken);

  const params: OneInchQuoteParams = {
    fromTokenAddress: sellToken,
    toTokenAddress: buyToken,
    amount: fromAmount.toString(),
    fee: feePercentage.toString(),
    gasPrice: gasPrice?.toString()
  };

  const { data } = await axios.get(`${get1InchBaseUrl(network)}/quote`, {
    params
  });

  const {
    data: { address: allowanceTarget }
  } = await axios.get(`${get1InchBaseUrl(network)}/approve/spender`);

  return {
    buyAmount: data.toTokenAmount,
    sellAmount: data.fromTokenAmount,
    gas: Number(data.estimatedGas),
    allowanceTarget,
    feeBasisPoints: BASIS_POINTS_DIVISOR * (feePercentage / 100)
  };
};

const oneInchTransactionHandler = async (input: ConvertTransactionInput): Promise<Transaction> => {
  const {
    network,
    fromToken: { address: sellToken },
    toToken: { address: buyToken },
    gasPrice,
    sellAmount,
    slippage
  } = input;
  const feePercentage = await getApiFeeAsPercentage(network, sellToken, buyToken);

  const params: OneInchSwapParams = {
    fromTokenAddress: sellToken,
    toTokenAddress: buyToken,
    amount: sellAmount.toString(),
    fromAddress: sellToken,
    slippage: slippage.toString(),
    referrerAddress: config.convert.feeAddress,
    fee: feePercentage.toString(),
    gasPrice: gasPrice.toString()
  };

  const { data } = await axios.get(`${get1InchBaseUrl(network)}/swap`, {
    params
  });

  return {
    to: data.tx.to,
    value: data.tx.value,
    data: data.tx.data
  };
};

export default {
  weight: oneInchWeight,
  quote: oneInchQuoteHandler,
  transaction: oneInchTransactionHandler
};
