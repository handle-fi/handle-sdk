import { BigNumber, ethers, Signer } from "ethers";
import { Network } from "../../types/network";
import { HlpInfoMethods } from "../Trade/types";
import routes from "./routes";
import { WeightInput } from "./routes/weights";
import { TokenInfo } from "@uniswap/token-lists";
import { CHAIN_ID_TO_NETWORK_NAME } from "../../constants";

export type ConvertQuoteInput = {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromAmount: BigNumber;
  connectedAccount: string | undefined;
  gasPrice: BigNumber | undefined;
  hlpMethods?: HlpInfoMethods;
  provider?: ethers.providers.Provider | Signer;
  tokenList: TokenInfo[];
  network: Network;
};

export type Quote = {
  buyAmount: string;
  sellAmount: string;
  gas: number;
  allowanceTarget: string | null;
  feeBasisPoints: number;
};

export type ConvertTransactionInput = {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  buyAmount: BigNumber;
  sellAmount: BigNumber;
  slippage: number;
  hlpMethods?: HlpInfoMethods;
  gasPrice: BigNumber;
  connectedAccount: string;
  signer: Signer;
  tokenList: TokenInfo[];
  network: Network;
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

  private static getNetwork = (token1: TokenInfo, token2: TokenInfo): Network => {
    if (token1.chainId !== token2.chainId) {
      throw new Error(`Tokens ${token1.symbol} and ${token2.symbol} are on different chains`);
    }
    const network = CHAIN_ID_TO_NETWORK_NAME[token1.chainId];
    if (!network) {
      throw new Error(`Token ${token1.symbol} is on an unsupported chain`);
    }
    return network;
  };

  public static getQuote = async (input: Omit<ConvertQuoteInput, "network">): Promise<Quote> => {
    const network = Convert.getNetwork(input.fromToken, input.toToken);
    const route = await this.getHighestWeightRoute({
      fromToken: input.fromToken,
      toToken: input.toToken,
      signerOrProvider: input.provider,
      network: network
    });
    return route.quote({ ...input, network });
  };

  public static getSwap = async (
    input: Omit<ConvertTransactionInput, "network">
  ): Promise<ethers.PopulatedTransaction> => {
    const network = Convert.getNetwork(input.fromToken, input.toToken);
    const route = await this.getHighestWeightRoute({
      fromToken: input.fromToken,
      toToken: input.toToken,
      signerOrProvider: input.signer,
      network: network
    });
    return route.transaction({ ...input, network });
  };
}
