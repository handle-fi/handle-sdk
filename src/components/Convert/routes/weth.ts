import { ethers } from "ethers";
import { Quote, config, HandleTokenManager } from "../../..";
import { WETH__factory } from "../../../contracts";
import { ConvertQuoteInput, ConvertTransactionInput } from "../Convert";
import { WeightInput, WETH_WEIGHT } from "./weights";

const wethWeight = async (input: WeightInput): Promise<number> => {
  const weth = new HandleTokenManager().getHlpWrappedNativeToken(input.network)?.address;
  if (!weth) return 0;
  if (
    (input.fromToken.address === weth && input.toToken.isNative) ||
    (input.toToken.address === weth && input.fromToken.isNative)
  ) {
    return WETH_WEIGHT;
  }
  return 0;
};

const wethQuoteHandler = async (input: ConvertQuoteInput): Promise<Quote> => {
  return {
    allowanceTarget: null,
    buyAmount: input.fromAmount.toString(), // WETH swap is always 1 to 1
    sellAmount: input.fromAmount.toString(),
    gas: config.convert.gasEstimates.weth,
    feeBasisPoints: 0
  };
};

const wethTransactionHandler = async (
  input: ConvertTransactionInput
): Promise<ethers.PopulatedTransaction> => {
  const { fromToken, toToken, network, sellAmount, signer } = input;
  const weth = new HandleTokenManager().getHlpWrappedNativeToken(input.network)?.address;

  if (!weth) throw new Error(`No WETH contract found for ${network}`);

  if (fromToken.extensions?.isNative && toToken.address === weth) {
    return WETH__factory.connect(weth, signer).populateTransaction.deposit({
      value: sellAmount
    });
  }

  if (toToken.extensions?.isNative && fromToken.address === weth) {
    return WETH__factory.connect(weth, signer).populateTransaction.withdraw(sellAmount);
  }

  throw new Error("Invalid WETH swap");
};

export default {
  weight: wethWeight,
  quote: wethQuoteHandler,
  transaction: wethTransactionHandler
};
