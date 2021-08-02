import { fxToken } from "./fxToken";
import { ethers } from "ethers";
import { CollateralToken } from "./CollateralToken";
import { SDK } from "./SDK";
import { queryFxTokens } from "../readers/fxTokens";
import { queryCollateralTokens } from "../readers/collateralTokens";
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

  public static async queryFxTokens(sdk: SDK, filter: any): Promise<fxToken[]> {
    return queryFxTokens(sdk.gqlClient, filter);
  }

  public static async queryCollateralTokens(sdk: SDK, filter: any): Promise<CollateralToken[]> {
    return queryCollateralTokens(sdk.gqlClient, filter);
  }

  public async loadFxTokens() {
    this.fxTokens = await queryFxTokens(this.sdk.gqlClient, {});
  }

  public async loadCollateralTokens() {
    this.collateralTokens = await queryCollateralTokens(this.sdk.gqlClient, {});
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
