import { BigNumber, ethers, Signer } from "ethers";
import { Network } from "../../types/network";
import { HlpToken } from "../../config/hlp";
import { HlpInfoMethods } from "../Trade/types";
import routes from "./routes";

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
  allowanceTarget: string;
  feeBasisPoints: number;
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
  public static getQuote = async (input: ConvertQuoteInput): Promise<Quote> => {
    const weightedRoutes = await Promise.all(
      routes.map((route) =>
        route
          .weight({
            fromToken: input.fromToken,
            toToken: input.toToken,
            network: input.network,
            provider: input.provider
          })
          .then((calculatedWeight) => ({
            handler: route.quote,
            calculatedWeight: calculatedWeight
          }))
      )
    );
    weightedRoutes.sort((a, b) => b.calculatedWeight - a.calculatedWeight);
    const route = weightedRoutes[0];
    if (route.calculatedWeight === 0) {
      throw new Error(`No route found for ${input.fromToken.symbol} and ${input.toToken.symbol}`);
    }
    return route.handler(input);
  };

  public static getSwap = async (
    input: ConvertTransactionInput
  ): Promise<ethers.PopulatedTransaction> => {
    const weightedRoutes = await Promise.all(
      routes.map((route) =>
        route
          .weight({
            fromToken: input.fromToken,
            toToken: input.toToken,
            network: input.network,
            provider: input.signer
          })
          .then((calculatedWeight) => ({
            handler: route.transaction,
            calculatedWeight: calculatedWeight
          }))
      )
    );
    weightedRoutes.sort((a, b) => b.calculatedWeight - a.calculatedWeight);
    const route = weightedRoutes[0];
    if (route.calculatedWeight === 0) {
      throw new Error(`No route found for ${input.fromToken.symbol} and ${input.toToken.symbol}`);
    }
    return route.handler(input);
  };
}
