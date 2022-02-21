import axios from "axios";
import { BigNumber } from "ethers";
import ethereum from "../data/tokens/ethereum-tokens.json";
import polygon from "../data/tokens/polygon-tokens.json";
import arbitrum from "../data/tokens/arbitrum-tokens.json";
import { ConvertNetwork, ConvertNetworkMap } from "../types/network";
import { TokenExtended } from "../types/tokens";
import sdkConfig from "../config";

type GetQuoteArguments = {
  sellToken: string;
  buyToken: string;
  sellAmount: BigNumber | undefined;
  buyAmount: BigNumber | undefined;
  gasPrice: BigNumber;
  fromAddress: string | undefined;
  network: ConvertNetwork;
};

type GetSwapArguments = {
  sellToken: string;
  buyToken: string;
  sellAmount: BigNumber | undefined;
  buyAmount: BigNumber | undefined;
  slippagePercentage: number;
  gasPrice: BigNumber;
  fromAddress: string;
  network: ConvertNetwork;
};

export type Quote = {
  buyAmount: string;
  sellAmount: string;
  gas: string;
  allowanceTarget: string;
};

export type Swap = Quote & {
  to: string;
  value: string;
  data: string;
};

type ZeroXQuoteParams = {
  buyToken: string;
  sellToken: string;
  sellAmount: string | undefined;
  buyAmount: string | undefined;
  buyTokenPercentageFee: string;
  feeRecipient: string;
  gasPrice: string;
  takerAddress: string | undefined;
};

type ZeroXSwapParams = ZeroXQuoteParams & {
  affiliateAddress: string;
  slippagePercentage: string;
};

type OneInchQuoteParams = {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fee: string;
  gasPrice: string;
};

type OneInchSwapParams = OneInchQuoteParams & {
  fromAddress: string;
  slippage: string;
  referrerAddress: string;
};

const NETWORK_TO_TOKENS: ConvertNetworkMap<TokenExtended<string>[]> = {
  ethereum,
  arbitrum,
  polygon
};

export default class Convert {
  public getQuote = async ({
    sellToken,
    buyToken,
    sellAmount,
    buyAmount,
    gasPrice,
    fromAddress,
    network
  }: GetQuoteArguments): Promise<Quote> => {
    if (network === "arbitrum") {
      if (!sellAmount) {
        throw new Error("Must supply a sell amount when trading on arbitrum");
      }
      return this.get1InchQuote(sellToken, buyToken, sellAmount, gasPrice, network);
    }

    return this.get0xQuote(
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      gasPrice,
      fromAddress,
      network
    );
  };

  public getSwap = async ({
    sellToken,
    buyToken,
    sellAmount,
    buyAmount,
    slippagePercentage,
    gasPrice,
    fromAddress,
    network
  }: GetSwapArguments): Promise<Swap> => {
    if (sellAmount && buyAmount) {
      throw new Error("Can't set both sell and buy amounts");
    }

    if (network === "arbitrum") {
      if (!sellAmount) {
        throw new Error("Must supply a sell amount when trading on arbitrum");
      }

      return this.get1InchSwap(
        sellToken,
        buyToken,
        sellAmount,
        slippagePercentage,
        gasPrice,
        fromAddress,
        network
      );
    }

    return this.get0xSwap(
      sellToken,
      buyToken,
      sellAmount,
      buyAmount,
      slippagePercentage,
      gasPrice,
      fromAddress,
      network
    );
  };

  private get0xQuote = async (
    sellToken: string,
    buyToken: string,
    sellAmount: BigNumber | undefined,
    buyAmount: BigNumber | undefined,
    gasPrice: BigNumber,
    takerAddress: string | undefined,
    network: ConvertNetwork
  ): Promise<Quote> => {
    const fee = await this.getFeeAsPercentage(network, sellToken, buyToken);

    const params: ZeroXQuoteParams = {
      buyToken,
      sellToken,
      sellAmount: sellAmount?.toString(),
      buyAmount: buyAmount?.toString(),
      buyTokenPercentageFee: (fee / 100).toString(),
      feeRecipient: sdkConfig.convert.feeAddress,
      gasPrice: gasPrice.toString(),
      takerAddress
    };

    const { data } = await axios.get(`${this.get0xBaseUrl(network)}/price`, {
      params
    });

    return {
      buyAmount: data.buyAmount,
      sellAmount: data.sellAmount,
      gas: data.gas,
      allowanceTarget: data.allowanceTarget
    };
  };

  private get1InchQuote = async (
    sellToken: string,
    buyToken: string,
    sellAmount: BigNumber,
    gasPrice: BigNumber,
    network: ConvertNetwork
  ): Promise<Quote> => {
    const fee = await this.getFeeAsPercentage(network, sellToken, buyToken);

    const params: OneInchQuoteParams = {
      fromTokenAddress: sellToken,
      toTokenAddress: buyToken,
      amount: sellAmount.toString(),
      fee: fee.toString(),
      gasPrice: gasPrice.toString()
    };

    const { data } = await axios.get(`${this.get1InchBaseUrl(network)}/quote`, {
      params
    });

    const {
      data: { address: allowanceTarget }
    } = await axios.get(`${this.get1InchBaseUrl(network)}/approve/spender`);

    return {
      buyAmount: data.toTokenAmount,
      sellAmount: data.fromTokenAmount,
      gas: data.estimatedGas,
      allowanceTarget
    };
  };

  private get0xSwap = async (
    sellToken: string,
    buyToken: string,
    sellAmount: BigNumber | undefined,
    buyAmount: BigNumber | undefined,
    slippagePercentage: number,
    gasPrice: BigNumber,
    takerAddress: string,
    network: ConvertNetwork
  ): Promise<Swap> => {
    const fee = await this.getFeeAsPercentage(network, sellToken, buyToken);

    const params: ZeroXSwapParams = {
      buyToken,
      sellToken,
      sellAmount: sellAmount?.toString(),
      buyAmount: buyAmount?.toString(),
      affiliateAddress: sdkConfig.convert.feeAddress,
      slippagePercentage: (slippagePercentage / 100).toString(),
      gasPrice: gasPrice.toString(),
      buyTokenPercentageFee: (fee / 100).toString(),
      feeRecipient: sdkConfig.convert.feeAddress,
      takerAddress
    };

    const { data } = await axios.get(`${this.get0xBaseUrl(network)}/quote`, {
      params
    });

    return {
      to: data.to,
      buyAmount: data.buyAmount,
      sellAmount: data.sellAmount,
      allowanceTarget: data.allowanceTarget,
      value: data.value,
      data: data.data,
      gas: data.gas
    };
  };

  public get1InchSwap = async (
    sellToken: string,
    buyToken: string,
    sellAmount: BigNumber,
    slippagePercentage: number,
    gasPrice: BigNumber,
    fromAddress: string,
    network: ConvertNetwork
  ): Promise<Swap> => {
    const fee = await this.getFeeAsPercentage(network, sellToken, buyToken);

    const params: OneInchSwapParams = {
      fromTokenAddress: sellToken,
      toTokenAddress: buyToken,
      amount: sellAmount.toString(),
      fromAddress,
      slippage: slippagePercentage.toString(),
      referrerAddress: sdkConfig.convert.feeAddress,
      fee: fee.toString(),
      gasPrice: gasPrice.toString()
    };

    const { data } = await axios.get(`${this.get1InchBaseUrl(network)}/swap`, {
      params
    });

    const {
      data: { address: allowanceTarget }
    } = await axios.get(`${this.get1InchBaseUrl(network)}/approve/spender`);

    return {
      to: data.tx.to,
      buyAmount: data.toTokenAmount,
      sellAmount: data.fromTokenAmount,
      allowanceTarget,
      value: data.tx.value,
      data: data.tx.data,
      gas: data.tx.gas
    };
  };

  public getFeeAsPercentage = async (
    network: ConvertNetwork,
    sellTokenAddress: string,
    buyTokenAddress: string
  ): Promise<number> => {
    const SAME_CURRENCY_STABLE_TO_SAME_CURRENCY_STABLE_FEE = 0.04;
    const STABLE_TO_STABLE_FEE = 0.1;
    const NON_STABLE_FEE = 0.3;

    const sellToken = NETWORK_TO_TOKENS[network].find(
      (token) => token.address.toLowerCase() === sellTokenAddress.toLowerCase()
    );

    const buyToken = NETWORK_TO_TOKENS[network].find(
      (token) => token.address.toLowerCase() === buyTokenAddress.toLowerCase()
    );

    if (buyToken?.address === sdkConfig.forexAddress) {
      return 0;
    }

    if (network === "ethereum") {
      // on ethereum we only charge the user if they are selling FOREX
      if (sellToken?.address === sdkConfig.forexAddress) {
        return NON_STABLE_FEE;
      } else {
        return 0;
      }
    }

    if (!sellToken || !buyToken) {
      // if one of the tokens cant be found it isnt a swap between our recognised stables
      return NON_STABLE_FEE;
    }

    const sellTokenStableType = sdkConfig.convert.tokenSymbolToStableType[sellToken.symbol];
    const buyTokenStableType = sdkConfig.convert.tokenSymbolToStableType[buyToken.symbol];

    if (!sellTokenStableType || !buyTokenStableType) {
      // if one of the token doesnt have a type it isnt a swap between our recognised stables
      return NON_STABLE_FEE;
    }

    if (sellTokenStableType === buyTokenStableType) {
      // both are the same currency stable coin
      return SAME_CURRENCY_STABLE_TO_SAME_CURRENCY_STABLE_FEE;
    }

    // both stables but different currencies
    return STABLE_TO_STABLE_FEE;
  };

  private get0xBaseUrl = (network: ConvertNetwork) =>
    `https://${network === "ethereum" ? "" : network + "."}api.0x.org/swap/v1`;

  private get1InchBaseUrl = (network: ConvertNetwork) => {
    const networkNameToIdMap: ConvertNetworkMap<number> = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161
    };
    return `https://api.1inch.exchange/v4.0/${networkNameToIdMap[network]}`;
  };
}
