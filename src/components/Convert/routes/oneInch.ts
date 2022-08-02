import axios from "axios";
import { BigNumber, ethers } from "ethers";
import { config, Network, NETWORK_NAME_TO_CHAIN_ID } from "../../..";
import { BASIS_POINTS_DIVISOR } from "../../../config/hlp";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { getApiFeeAsPercentage } from "../getApiFeeAsPercentage";
import { ONE_INCH_WEIGHT, WeightInput } from "./weights";

const get1InchBaseUrl = (network: Network) => {
  return `https://api.1inch.exchange/v4.0/${NETWORK_NAME_TO_CHAIN_ID[network]}`;
};

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

const oneInchQuoteHandler = async (input: ConvertQuoteRouteArgs): Promise<Quote> => {
  const {
    network,
    fromToken: { address: sellToken },
    toToken: { address: buyToken },
    sellAmount: fromAmount,
    gasPrice
  } = input;
  const feePercentage = await getApiFeeAsPercentage(sellToken, buyToken);

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
    feeBasisPoints: BASIS_POINTS_DIVISOR * (feePercentage / 100),
    feeChargedBeforeConvert: true,
    priceBpsDifference: 0 // we don't currently have a way to calculate this
  };
};

const oneInchTransactionHandler = async (
  input: ConvertTransactionRouteArgs
): Promise<ethers.PopulatedTransaction> => {
  const {
    network,
    fromToken: { address: sellToken },
    toToken: { address: buyToken },
    gasPrice,
    sellAmount,
    slippage,
    receivingAccount: connectedAccount
  } = input;
  const feePercentage = await getApiFeeAsPercentage(sellToken, buyToken);

  const params: OneInchSwapParams = {
    fromTokenAddress: sellToken,
    toTokenAddress: buyToken,
    amount: sellAmount.toString(),
    fromAddress: connectedAccount,
    slippage: slippage.toString(),
    referrerAddress: config.convert.feeAddress,
    fee: feePercentage.toString(),
    gasPrice: gasPrice?.toString()
  };

  const { data } = await axios.get(`${get1InchBaseUrl(network)}/swap`, {
    params
  });

  return {
    to: data.tx.to,
    value: BigNumber.from(data.tx.value),
    data: data.tx.data
  };
};

export default {
  weight: oneInchWeight,
  quote: oneInchQuoteHandler,
  transaction: oneInchTransactionHandler
};
