import { BigNumber, ethers, Signer } from "ethers";
import { Network } from "../../types/network";
import { HlpToken } from "../../config/hlp";
import { HlpInfoMethods } from "../Trade/types";
import routes from "./routes";
import { WeightInput } from "./routes/weights";

export type ConvertQuoteInput = {
  fromToken: HlpToken;
  toToken: HlpToken;
  fromAmount: BigNumber;
  connectedAccount: string | undefined;
  gasPrice: BigNumber | undefined;
  network: Network;
  hlpMethods?: HlpInfoMethods;
  provider?: ethers.providers.Provider | Signer;
};

export type Quote = {
  buyAmount: string;
  sellAmount: string;
  gas: number;
  allowanceTarget: string | null;
  feeBasisPoints: number;
  feeChargedBeforeConvert?: boolean;
};

export type ConvertTransactionInput = {
  network: Network;
  fromToken: HlpToken;
  toToken: HlpToken;
  buyAmount: BigNumber;
  sellAmount: BigNumber;
  slippage: number;
  hlpMethods?: HlpInfoMethods;
  gasPrice: BigNumber;
  connectedAccount: string;
  signer: Signer;
};

export default class Convert {
  private static getHighestWeightRoute = async (weightInfo: WeightInput) => {
    const weightedRoutes = await Promise.all(
      routes.map((route) =>
        route.weight(weightInfo).then((calculatedWeight) => ({
          quote: route.quote,
          transaction: route.transaction,
          calculatedWeight
        }))
      )
    );
    weightedRoutes.sort((a, b) => b.calculatedWeight - a.calculatedWeight);
    const route = weightedRoutes[0];
    if (route.calculatedWeight === 0) {
      throw new Error(
        `No route found for ${weightInfo.fromToken.symbol} and ${weightInfo.toToken.symbol}`
      );
    }
    return route;
  };

  public static getQuote = async (input: ConvertQuoteInput): Promise<Quote> => {
    const route = await this.getHighestWeightRoute({
      fromToken: input.fromToken,
      toToken: input.toToken,
      signerOrProvider: input.provider,
      network: input.network
    });
    return route.quote(input);
  };

  public static getSwap = async (
    input: ConvertTransactionInput
  ): Promise<ethers.PopulatedTransaction> => {
    const route = await this.getHighestWeightRoute({
      fromToken: input.fromToken,
      toToken: input.toToken,
      signerOrProvider: input.signer,
      network: input.network
    });
    return route.transaction(input);
  };
}
