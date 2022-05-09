import axios from "axios";
import { BigNumber, ethers, PopulatedTransaction, Signer } from "ethers";
import ethereum from "../../data/tokens/ethereum-tokens.json";
import polygon from "../../data/tokens/polygon-tokens.json";
import arbitrum from "../../data/tokens/arbitrum-tokens.json";
import { ConvertNetwork, ConvertNetworkMap, Network } from "../../types/network";
import { TokenExtended } from "../../types/tokens";
import sdkConfig from "../../config";
import { getNativeWrappedToken, tryParseNativeHlpToken } from "../../utils/hlp";
import {
  BASIS_POINTS_DIVISOR,
  HlpToken,
  HLP_CONTRACTS,
  HLP_SWAP_GAS_LIMIT
} from "../../config/hlp";
import { HlpInfoMethods } from "../Trade/types";
import { getHlpTokenQuote } from "./getHlpTokenQuote";
import { getSwapFeeBasisPoints } from "../Trade/getSwapFeeBasisPoints";
import { getHlpTokenSwap, getLiquidityTokenSwap } from "./hlpSwapTransaction";
import { WETH__factory } from "../../contracts/factories/WETH__factory";
import { isTokenPegged } from "./isTokenPegged";
import { getPegStabilityTransaction } from "./getPegStabilityTransaction";
import { getPegStabilityQuote } from "./getPegStabilityQuote";
import { HlpConfig } from "../..";

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

export type ConvertQuoteInput = {
  canUseHlp: boolean;
  fromToken: HlpToken;
  toToken: HlpToken;
  fromAmount: BigNumber;
  connectedAccount: string | undefined;
  gasPrice: BigNumber | undefined;
  network: Network;
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
  hlpInfo: HlpInfoMethods;
  gasPrice: BigNumber;
  connectedAccount: string;
  canUseHlp: boolean;
  signer: Signer;
};

export type Transaction = ethers.PopulatedTransaction;

const NETWORK_TO_TOKENS: ConvertNetworkMap<TokenExtended<string>[]> = {
  ethereum,
  arbitrum,
  polygon
};

export default class Convert {
  public getQuote = async (
    input: ConvertQuoteInput,
    hlpInfo: HlpInfoMethods
  ): Promise<{ quote: Quote; feeBasisPoints?: BigNumber }> => {
    const {
      provider,
      canUseHlp,
      fromToken,
      toToken,
      fromAmount,
      connectedAccount,
      gasPrice,
      network
    } = input;

    const weth = getNativeWrappedToken(network)?.address;

    let isPsmDeposit = false;
    let isPsmWithdraw = false;
    if (HlpConfig.HLP_CONTRACTS[network]?.HPSM && provider) {
      isPsmWithdraw = await isTokenPegged(fromToken.address, toToken.address, provider, network);
      isPsmDeposit = await isTokenPegged(toToken.address, fromToken.address, provider, network);
    }

    if (
      (fromToken.isNative && toToken.address === weth) ||
      (toToken.isNative && fromToken.address === weth)
    ) {
      return {
        quote: {
          allowanceTarget: ethers.constants.AddressZero,
          buyAmount: fromAmount.toString(), // WETH swap is always 1 to 1
          sellAmount: fromAmount.toString(),
          gas: HLP_SWAP_GAS_LIMIT
        },
        feeBasisPoints: ethers.constants.Zero
      };
    }

    if ((isPsmDeposit || isPsmWithdraw) && provider) {
      return getPegStabilityQuote({
        network,
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount,
        provider
      });
    }

    // If tokens are hLP, go increase / decrease liquidity
    if (toToken.symbol === "hLP" || fromToken.symbol === "hLP") {
      return getHlpTokenQuote({
        fromToken,
        toToken,
        fromAmount,
        network,
        hlpInfo
      });
    }
    if (!canUseHlp) {
      // Return quote from SDK.
      return {
        quote: await this.getApiQuote({
          sellToken: fromToken.address,
          buyToken: toToken.address,
          buyAmount: undefined,
          sellAmount: fromAmount,
          fromAddress: connectedAccount || ethers.constants.AddressZero,
          network,
          // we dont care about passing through a gas cost when
          // users wallet isnt connected.
          gasPrice: gasPrice || ethers.constants.Zero
        })
      };
    }

    // Return quote from Hlp.

    // Parse ETH address into WETH address.
    const { address: parsedFromTokenAddress } = tryParseNativeHlpToken(fromToken, network);
    const { address: parsedToTokenAddress } = tryParseNativeHlpToken(toToken, network);

    const priceIn = hlpInfo.getMinPrice(parsedFromTokenAddress);
    const priceOut = hlpInfo.getMaxPrice(parsedToTokenAddress);

    const amountOut = fromAmount.mul(priceIn).div(priceOut.isZero() ? 1 : priceOut);

    const feeBasisPoints = getSwapFeeBasisPoints({
      tokenIn: parsedFromTokenAddress,
      tokenOut: parsedToTokenAddress,
      usdgDelta: priceIn
        .mul(fromAmount)
        .mul(ethers.utils.parseUnits("1", 18))
        .div(ethers.utils.parseUnits("1", 30))
        .div(ethers.utils.parseUnits("1", fromToken.decimals)),
      usdgSupply: hlpInfo.getUsdgSupply(),
      totalTokenWeights: hlpInfo.getTotalTokenWeights(),
      targetUsdgAmount: hlpInfo.getTargetUsdgAmount(parsedFromTokenAddress),
      getTokenInfo: hlpInfo.getTokenInfo
    });

    return {
      quote: {
        allowanceTarget: HLP_CONTRACTS[network]?.Router,
        buyAmount: amountOut.toString(),
        sellAmount: fromAmount.toString(),
        gas: HLP_SWAP_GAS_LIMIT
      } as Quote,
      feeBasisPoints
    };
  };

  public getApiQuote = async ({
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
    network,
    fromToken,
    toToken,
    buyAmount,
    sellAmount,
    slippage,
    hlpInfo,
    gasPrice,
    connectedAccount,
    canUseHlp,
    signer
  }: ConvertTransactionInput): Promise<{
    tx: PopulatedTransaction;
    gasEstimate: BigNumber;
  }> => {
    let tx: PopulatedTransaction;

    let weth = getNativeWrappedToken(network)?.address;
    let buyAmountWithTolerance = BigNumber.from(buyAmount)
      .mul(BASIS_POINTS_DIVISOR - slippage * 100)
      .div(BASIS_POINTS_DIVISOR);

    let isPsmDeposit = false;
    let isPsmWithdraw = false;
    if (HlpConfig.HLP_CONTRACTS[network]?.HPSM) {
      isPsmWithdraw = await isTokenPegged(fromToken.address, toToken.address, signer, network);
      isPsmDeposit = await isTokenPegged(toToken.address, fromToken.address, signer, network);
    }

    if (fromToken.isNative && toToken.address === weth) {
      tx = await WETH__factory.connect(weth, signer).populateTransaction.deposit({
        value: sellAmount
      });
    } else if (toToken.isNative && fromToken.address === weth) {
      tx = await WETH__factory.connect(weth, signer).populateTransaction.withdraw(sellAmount);
    } else if (isPsmDeposit || isPsmWithdraw) {
      tx = await getPegStabilityTransaction({
        fromAmount: buyAmount,
        toToken: toToken.address,
        fromToken: fromToken.address,
        network,
        signer
      });
    } else if (fromToken.symbol === "hLP" || toToken.symbol === "hLP") {
      tx = await getHlpTokenSwap({
        fromToken,
        toToken,
        buyAmountWithTolerance,
        connectedAccount,
        network,
        sellAmount: BigNumber.from(sellAmount),
        hlpInfo,
        signer,
        slippage
      });
    } else if (!canUseHlp) {
      const swap = await this.getApiSwap({
        sellToken: fromToken.address,
        buyToken: toToken.address,
        gasPrice,
        network,
        slippagePercentage: slippage,
        fromAddress: connectedAccount,
        sellAmount: BigNumber.from(sellAmount),
        buyAmount: undefined
      });
      return {
        tx: {
          to: swap.to,
          data: swap.data,
          value: BigNumber.from(swap.value)
        },
        gasEstimate: BigNumber.from(swap.gas)
      };
    } else {
      const { address: fromAddress, isNative: isFromNative } = tryParseNativeHlpToken(
        fromToken,
        network
      );
      const { address: toAddress, isNative: isToNative } = tryParseNativeHlpToken(toToken, network);

      buyAmountWithTolerance = BigNumber.from(buyAmount)
        .mul(BASIS_POINTS_DIVISOR - slippage * 100)
        .div(BASIS_POINTS_DIVISOR);

      weth = getNativeWrappedToken(network)?.address;
      tx = await getLiquidityTokenSwap({
        isFromNative,
        isToNative,
        fromAddress,
        toAddress,
        buyAmountWithTolerance,
        network,
        connectedAccount,
        signer,
        transactionAmount: BigNumber.from(sellAmount)
      });
    }

    return {
      tx,
      gasEstimate: await signer.estimateGas(tx)
    };
  };

  public getApiSwap = async ({
    sellToken,
    buyToken,
    sellAmount,
    buyAmount,
    slippagePercentage,
    gasPrice,
    fromAddress,
    network
  }: GetSwapArguments): Promise<Transaction> => {
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
      gas: Number(data.gas),
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
      gas: Number(data.estimatedGas),
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
  ): Promise<Transaction> => {
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
  ): Promise<Transaction> => {
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
