import axios, { AxiosInstance } from "axios";
import { BigNumber } from "ethers";
import homestead from "../../tokens/homestead.json";
import polygon from "../../tokens/polygon.json";

type Token = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon: string;
  displayDecimals: number;
};

type SupportedNetwork = "homestead" | "kovan" | "polygon";

// this is a short term solution to ensure that sdk users
// cant bypass the handle convert fees.
const HANDLE_TOKEN_TYPES: { [key: string]: string } = {
  USDC: "USD",
  LUSD: "USD",
  DAI: "USD",
  USDT: "USD",
  sUSD: "USD",
  EURS: "EURO"
};

const HANDLE_FEE_ADDRESS = "0xFa2c1bE677BE4BEc8851D1577B343F7060B51E3A";

export class Convert {
  private client: AxiosInstance;
  private tokenAddressToType: { [key: string]: string } | undefined;
  private tokenList: Token[];

  constructor(network: SupportedNetwork) {
    const baseURL = `https://${network === "homestead" ? "" : network + "."}api.0x.org`;

    this.client = axios.create({
      baseURL,
      headers: {
        "Cache-Control": "no-store"
      }
    });

    this.tokenList = network === "polygon" ? polygon : homestead;
  }

  public getTokens = async () => {
    await this.setTokenAddressToType(this.tokenList);
    return this.tokenList;
  };

  public getQuote = async (
    sellToken: string,
    buyToken: string,
    sellAmount: BigNumber | undefined,
    buyAmount: BigNumber | undefined,
    slippagePercentage: string,
    gasPriceInWei: string
  ) => {
    if (sellAmount && buyAmount) {
      throw new Error("Can't set both sell and buy amounts");
    }

    if (!this.tokenAddressToType) {
      await this.setTokenAddressToType();
    }

    const { data } = await this.client.get("/swap/v1/quote", {
      params: {
        buyToken,
        sellToken,
        sellAmount: sellAmount?.toString(),
        buyAmount: buyAmount?.toString(),
        feeRecipient: HANDLE_FEE_ADDRESS,
        affiliateAddress: HANDLE_FEE_ADDRESS,
        buyTokenPercentageFee: this.getFees(buyToken, sellToken),
        slippagePercentage: Number(slippagePercentage) / 100,
        gasPrice: gasPriceInWei
      }
    });
    return data;
  };

  private setTokenAddressToType = async (tokens?: Token[]) => {
    this.tokenAddressToType = {};

    try {
      tokens = tokens || (await this.getTokens());

      tokens.forEach((t) => {
        if (!this.tokenAddressToType) {
          return;
        }

        if (HANDLE_TOKEN_TYPES[t.symbol]) {
          this.tokenAddressToType[t.address] = HANDLE_TOKEN_TYPES[t.symbol];
        }
      });
    } catch (e) {
      console.error("Failed to fetch token list. User will be charged the highest fee");
    }
  };

  private getFees = (tokenA: string, tokenB: string) => {
    const typeAType = this.tokenAddressToType?.[tokenA];
    const typeBType = this.tokenAddressToType?.[tokenB];

    if (!typeAType || !typeBType) {
      return "0.003";
    }

    if (typeAType === typeBType) {
      return "0.0004";
    }

    return "0.001";
  };
}
