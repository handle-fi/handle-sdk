import { BigNumber, ethers, Signer } from "ethers";
import { Network } from "../../types/network";
import { HlpInfoMethods } from "../../types/trade";
import routes from "./routes";
import { WeightInput } from "./routes/weights";
import { TokenInfo } from "@uniswap/token-lists";
import { CHAIN_ID_TO_NETWORK_NAME } from "../../constants";
import { getNetworkFromSignerOrProvider } from "../../utils/general-utils";
import { getLoadedConfig, HlpConfig } from "../../config/hlp";

type ConvertRouteArgs = {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  sellAmount: BigNumber;
  gasPrice: BigNumber | undefined;
  hlpMethods?: HlpInfoMethods;
  network: Network;
};

export type ConvertQuoteRouteArgs = ConvertRouteArgs & {
  signerOrProvider?: ethers.providers.Provider | Signer;
  receivingAccount?: string;
  hlpConfig?: HlpConfig;
};

export type ConvertTransactionRouteArgs = ConvertRouteArgs & {
  buyAmount: BigNumber;
  slippage: number;
  signer: Signer;
  receivingAccount: string;
};

type ConvertInput = Omit<ConvertRouteArgs, "network">;

type ConvertQuoteInput = ConvertInput & {
  signerOrProvider?: ethers.providers.Provider | Signer;
  receivingAccount?: string;
};

type ConvertTransactionInput = ConvertInput & {
  buyAmount: BigNumber;
  slippage: number;
  signer: Signer;
};

export type Quote = {
  buyAmount: string;
  sellAmount: string;
  gas: number;
  allowanceTarget: string | null;
  feeBasisPoints: number;
  feeChargedBeforeConvert: boolean;
  priceBpsDifference: number;
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

  private static getValidatedNetwork = async (
    token1: TokenInfo,
    token2: TokenInfo,
    signerOrProvider?: Signer | ethers.providers.Provider
  ): Promise<Network> => {
    // ensures tokens are on same network
    if (token1.chainId !== token2.chainId) {
      throw new Error(`Tokens ${token1.symbol} and ${token2.symbol} are on different chains`);
    }
    const network = CHAIN_ID_TO_NETWORK_NAME[token1.chainId];
    // ensures network is supported
    if (!network) {
      throw new Error(`Token ${token1.symbol} is on an unsupported chain`);
    }
    // if there is a signer or provider, make sure it is on the same chain as the token
    if (signerOrProvider && network !== (await getNetworkFromSignerOrProvider(signerOrProvider))) {
      throw new Error(`Signer/Provider is on a different network than the tokens`);
    }
    return network;
  };

  public static getQuote = async (input: ConvertQuoteInput): Promise<Quote> => {
    const network = await Convert.getValidatedNetwork(
      input.fromToken,
      input.toToken,
      input.signerOrProvider
    );
    const route = await this.getHighestWeightRoute({
      fromToken: input.fromToken,
      toToken: input.toToken,
      signerOrProvider: input.signerOrProvider,
      network: network,
      hasHlpMethods: !!input.hlpMethods
    });
    const quoteInput: ConvertQuoteRouteArgs = {
      ...input,
      network
    };
    try {
      quoteInput.hlpConfig = await getLoadedConfig(network);
    } catch (error) {
      console.error(error);
    }
    return route.quote(quoteInput);
  };

  public static getSwap = async (
    input: ConvertTransactionInput
  ): Promise<ethers.PopulatedTransaction> => {
    const network = await Convert.getValidatedNetwork(input.fromToken, input.toToken, input.signer);

    const route = await this.getHighestWeightRoute({
      fromToken: input.fromToken,
      toToken: input.toToken,
      signerOrProvider: input.signer,
      network: network,
      hasHlpMethods: !!input.hlpMethods
    });

    const receivingAccount = await input.signer.getAddress();

    return route.transaction({
      ...input,
      network,
      receivingAccount
    });
  };
}
