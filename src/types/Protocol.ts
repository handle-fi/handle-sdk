import { fxToken } from "./fxToken";
import { ethers } from "ethers";
import { CollateralToken } from "./CollateralToken";
import { SDK } from "./SDK";
import { readFxTokens } from "../readers/fxTokens";
import { readCollateralTokens } from "../readers/collateralTokens";
import { CollateralTokens, fxTokens } from "./ProtocolTokens";

/** Holds protocol data */
export class Protocol {
  private sdk: SDK;
  public fxTokens!: fxToken[];
  public collateralTokens!: CollateralToken[];
  public feeRecipient!: string;
  public fees!: {
    /** Mint fee ratio per 1,000 */
    mint: ethers.BigNumber;
    /** Burn fee ratio per 1,000 */
    burn: ethers.BigNumber;
    /** Withdraw fee ratio per 1,000 */
    withdraw: ethers.BigNumber;
    /** Deposit fee ratio per 1,000 */
    deposit: ethers.BigNumber;
  };

  private constructor(sdk: SDK) {
    this.sdk = sdk;
  }

  // @ts-ignore
  // TODO load all protocol data here via The Graph instead of from contracts.
  public static async from(sdk: SDK): Promise<Protocol> {
    const protocol = new Protocol(sdk);
    await protocol.loadFxTokens();
    await protocol.loadCollateralTokens();
    protocol.feeRecipient = await sdk.contracts.handle.FeeRecipient();
    const [mint, burn, withdraw, deposit] = await Promise.all([
      sdk.contracts.handle.mintFeePerMille(),
      sdk.contracts.handle.burnFeePerMille(),
      sdk.contracts.handle.withdrawFeePerMille(),
      sdk.contracts.handle.depositFeePerMille()
    ]);
    protocol.fees = {
      mint,
      burn,
      withdraw,
      deposit
    };
    return protocol;
  }

  public async loadFxTokens() {
    const indexedTokens = await readFxTokens(this.sdk.isKovan);
    this.fxTokens = [];
    for (let indexed of indexedTokens) {
      const [decimals, rate] = await Promise.all([
        // @ts-ignore TODO: index these
        this.sdk.contracts[indexed.symbol].decimals(),
        this.sdk.contracts.handle.getTokenPrice(indexed.address)
      ]);
      this.fxTokens.push({
        address: indexed.address,
        symbol: indexed.symbol,
        name: indexed.name,
        decimals,
        rate,
        rewardRatio: indexed.rewardRatio,
        totalSupply: indexed.totalSupply,
        isValid: indexed.isValid
      });
    }
  }

  public async loadCollateralTokens() {
    const indexedTokens = await readCollateralTokens(this.sdk.isKovan);
    this.collateralTokens = [];
    for (let indexed of indexedTokens) {
      this.collateralTokens.push({
        address: indexed.address,
        symbol: indexed.symbol,
        name: indexed.name,
        // @ts-ignore TODO: index this
        decimals: await this.sdk.contracts[indexed.symbol].decimals(),
        rate: await this.sdk.contracts.handle.getTokenPrice(indexed.address),
        // TODO: index this
        interestRate: await this.sdk.contracts.handle.interestRate(indexed.address),
        mintCollateralRatio: indexed.mintCollateralRatio,
        liquidationFee: indexed.liquidationFee,
        totalBalance: indexed.totalBalance,
        isValid: indexed.isValid
      });
    }
  }

  public getFxTokenBySymbol(symbol: fxTokens): fxToken {
    const token = this.fxTokens.find((x) => x.symbol === symbol);
    if (!token) throw new Error(`fxToken "${symbol}" not found`);
    return token;
  }

  public getCollateralTokenBySymbol(symbol: CollateralTokens): CollateralToken {
    const token = this.collateralTokens.find((x) => x.symbol === symbol);
    if (!token) throw new Error(`fxToken "${symbol}" not found`);
    return token;
  }

  public getCollateralTokenByAddress(address: string): CollateralToken {
    const token = this.collateralTokens.find((x) => x.address === address);
    if (!token) throw new Error(`Collateral token "${address}" not found`);
    return token;
  }
}
