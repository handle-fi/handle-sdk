import { BigNumber, ethers, Signer } from "ethers";
import { Network } from "../../types/network";
import { HlpInfoMethods } from "../Trade/types";
import routes from "./routes";
import { WeightInput } from "./routes/weights";
import { TokenInfo } from "@uniswap/token-lists";
import { CHAIN_ID_TO_NETWORK_NAME } from "../../constants";
import TokenManager from "../TokenManager";
import { getNetworkFromProviderOrSigner } from "../../utils/general-utils";

type ConvertRouteArgs = {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  sellAmount: BigNumber;
  receivingAccount: string;
  gasPrice: BigNumber | undefined;
  hlpMethods?: HlpInfoMethods;
  network: Network;
};

export type ConvertQuoteRouteArgs = ConvertRouteArgs & {
  signerOrProvider?: ethers.providers.Provider | Signer;
};

export type ConvertTransactionRouteArgs = ConvertRouteArgs & {
  buyAmount: BigNumber;
  slippage: number;
  signer: Signer;
};

type ConvertInput = Omit<ConvertRouteArgs, "network" | "tokenList">;

type ConvertQuoteInput = ConvertInput & {
  signerOrProvider?: ethers.providers.Provider | Signer;
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
};

export default class Convert {
  protected static tokenList: TokenInfo[] | undefined = undefined;

  public static loadTokens = async () => {
    const tokenManager = new TokenManager();
    await tokenManager.initialLoad;
    Convert.tokenList = tokenManager.getLoadedTokens();
  };

  public static getTokenList = async (): Promise<TokenInfo[]> => {
    if (!Convert.tokenList) {
      await Convert.loadTokens();
    }

    // token list will be loaded by now, so it is not undefined
    return Convert.tokenList!;
  };

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

  public static getQuote = async (input: ConvertQuoteInput): Promise<Quote> => {
    if (!this.tokenList) await this.loadTokens();

    const network = Convert.getNetwork(input.fromToken, input.toToken);

    if (
      input.signerOrProvider &&
      network !== (await getNetworkFromProviderOrSigner(input.signerOrProvider))
    ) {
      throw new Error(`Signer/Provider is on a different network than the tokens`);
    }

    const route = await this.getHighestWeightRoute({
      fromToken: input.fromToken,
      toToken: input.toToken,
      signerOrProvider: input.signerOrProvider,
      network: network
    });

    return route.quote({
      ...input,
      network
    });
  };

  public static getSwap = async (
    input: ConvertTransactionInput
  ): Promise<ethers.PopulatedTransaction> => {
    if (!this.tokenList) await this.loadTokens();

    const network = Convert.getNetwork(input.fromToken, input.toToken);

    if (network !== (await getNetworkFromProviderOrSigner(input.signer))) {
      throw new Error(`Signer is on a different network than the tokens`);
    }

    const route = await this.getHighestWeightRoute({
      fromToken: input.fromToken,
      toToken: input.toToken,
      signerOrProvider: input.signer,
      network: network
    });
    return route.transaction({
      ...input,
      network
    });
  };
}
