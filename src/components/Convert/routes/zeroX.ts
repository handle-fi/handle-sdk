import axios from "axios";
import { ConvertQuoteInput, ConvertTransactionInput, Quote } from "../Convert";
import { getApiFeeAsPercentage } from "../getApiFeeAsPercentage";
import config from "../../../config";
import { BASIS_POINTS_DIVISOR } from "../../../config/hlp";
import { WeightInput, ZERO_X_WEIGHT } from "./weights";
import { ethers } from "ethers";
import { Network } from "../../..";

export const get0xBaseUrl = (network: Network) =>
  `https://${network === "ethereum" ? "" : network + "."}api.0x.org/swap/v1`;

type ZeroXQuoteParams = {
  buyToken: string;
  sellToken: string;
  sellAmount: string | undefined;
  buyAmount?: string;
  buyTokenPercentageFee: string;
  feeRecipient: string;
  gasPrice?: string;
  takerAddress?: string;
};

type ZeroXSwapParams = ZeroXQuoteParams & {
  affiliateAddress: string;
  slippagePercentage: string;
};

const zeroXWeight = async (input: WeightInput) => {
  if (input.network === "ethereum" || input.network === "polygon") {
    return ZERO_X_WEIGHT;
  }
  return 0;
};

const zeroXQuoteHandler = async (input: ConvertQuoteInput): Promise<Quote> => {
  const {
    network,
    fromToken: { address: sellToken },
    toToken: { address: buyToken },
    fromAmount,
    gasPrice,
    connectedAccount
  } = input;
  const feePercentage = await getApiFeeAsPercentage(network, sellToken, buyToken);

  const params: ZeroXQuoteParams = {
    buyToken,
    sellToken,
    sellAmount: fromAmount?.toString(),
    buyTokenPercentageFee: (feePercentage / 100).toString(),
    feeRecipient: config.convert.feeAddress,
    gasPrice: gasPrice?.toString(),
    takerAddress: connectedAccount
  };

  const { data } = await axios.get(`${get0xBaseUrl(network)}/price`, {
    params
  });

  return {
    buyAmount: data.buyAmount,
    sellAmount: data.sellAmount,
    gas: Number(data.gas),
    allowanceTarget: data.allowanceTarget,
    feeBasisPoints: BASIS_POINTS_DIVISOR * (feePercentage / 100)
  };
};

const zeroXTransactionHandler = async (
  input: ConvertTransactionInput
): Promise<ethers.PopulatedTransaction> => {
  const {
    network,
    fromToken: { address: sellToken },
    toToken: { address: buyToken },
    gasPrice,
    connectedAccount,
    sellAmount,
    slippage
  } = input;
  const feePercentage = await getApiFeeAsPercentage(network, sellToken, buyToken);

  const params: ZeroXSwapParams = {
    buyToken,
    sellToken,
    sellAmount: sellAmount?.toString(),
    affiliateAddress: config.convert.feeAddress,
    slippagePercentage: slippage.toString(),
    gasPrice: gasPrice.toString(),
    buyTokenPercentageFee: (feePercentage / 100).toString(),
    feeRecipient: config.convert.feeAddress,
    takerAddress: connectedAccount
  };

  const { data } = await axios.get(`${get0xBaseUrl(network)}/quote`, {
    params
  });

  return {
    to: data.to,
    value: data.value,
    data: data.data
  };
};

export default {
  weight: zeroXWeight,
  quote: zeroXQuoteHandler,
  transaction: zeroXTransactionHandler
};
