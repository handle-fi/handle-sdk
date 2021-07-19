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
    const indexedTokens = await readFxTokens(this.sdk.gqlClient);
    this.fxTokens = [];
    for (let indexed of indexedTokens) {
      this.fxTokens.push(indexed);
    }
  }

  public async loadCollateralTokens() {
    const indexedTokens = await readCollateralTokens(this.sdk.gqlClient);
    this.collateralTokens = [];
    const promises = [];
    for (let indexed of indexedTokens) {
      promises.push(
        new Promise(async (resolve) => {
          this.collateralTokens.push(indexed);
          resolve(null);
        })
      );
    }
    await Promise.all(promises);
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
