import { ethers } from "ethers";
import config, { ChainlinkFeeds } from "../config";
import { ChainlinkAggregator__factory, ChainlinkAggregator } from "../contracts";
import { createMultiCallContract } from "../utils/contract-utils";
import { ContractCall, Provider as MultiCallProvider } from "ethers-multicall";
import chainlinkAggregatorAbi from "../abis/ChainlinkAggregator.json";
import { NETWORK_NAME_TO_CHAIN_ID } from "../constants";

export type Price = {
  bn: ethers.BigNumber;
  number: number;
};

type PricesConfig = {
  feeds: ChainlinkFeeds;
  chainId: number;
};
export default class Prices {
  private config: PricesConfig;

  constructor(c?: PricesConfig) {
    this.config = c || {
      feeds: config.protocol.arbitrum.chainlinkFeeds,
      chainId: NETWORK_NAME_TO_CHAIN_ID.arbitrum
    };
  }

  public getEthUsdPrice = async (signer: ethers.Signer): Promise<Price> => {
    const aggregator = ChainlinkAggregator__factory.connect(this.config.feeds.eth_usd, signer);
    const bn = await aggregator.latestAnswer();
    const number = this.chainlinkPriceToNumber(bn);

    return {
      bn,
      number
    };
  };

  public getFxTokenTargetUsdPrices = async (
    signer: ethers.Signer
  ): Promise<Record<string, Price>> => {
    const provider = new MultiCallProvider(signer.provider!, this.config.chainId);

    const fxTokenSymbolToFeedAddressMap: Record<string, string> = {
      fxAUD: this.config.feeds.aud_usd,
      fxPHP: this.config.feeds.php_usd,
      fxEUR: this.config.feeds.eur_usd,
      fxKRW: this.config.feeds.krw_usd,
      fxCNY: this.config.feeds.cny_usd,
      fxCHF: this.config.feeds.chf_usd,
      fxUSD: ""
    };

    const fxTokenSymbols = Object.keys(fxTokenSymbolToFeedAddressMap);

    // we remove usd as it will always be one
    const calls = fxTokenSymbols
      .filter((fx) => fx !== "fxUSD")
      .map((fx) => {
        const fxSymbol = fx as string;
        const multicall = createMultiCallContract<ChainlinkAggregator>(
          fxTokenSymbolToFeedAddressMap[fxSymbol],
          chainlinkAggregatorAbi
        );

        return multicall.latestAnswer() as unknown as ContractCall;
      });

    const response: ethers.BigNumber[] = await provider.all(calls);

    const result = response.reduce((progress, bn: ethers.BigNumber, index) => {
      return {
        ...progress,
        [fxTokenSymbols[index]]: {
          bn,
          number: this.chainlinkPriceToNumber(bn)
        }
      };
    }, {} as Record<string, Price>);

    return {
      ...result,
      fxUSD: {
        bn: ethers.utils.parseUnits("1", 8),
        number: 1
      }
    };
  };

  private chainlinkPriceToNumber = (price: ethers.BigNumber): number => {
    return Number(ethers.utils.formatUnits(price, 8));
  };
}
