import { fxToken } from "./fxToken";
import { ethers } from "ethers";
import { CollateralToken } from "./CollateralToken";
import { SDK } from "./SDK";

/** Holds protocol data */
export class Protocol {
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

  private constructor() {}

  // @ts-ignore
  // TODO load protocol data here via The Graph.
  public static async from(sdk: SDK): Promise<Protocol> {
    const protocol = new Protocol();
    protocol.fxTokens = [];
    protocol.collateralTokens = [];
    protocol.feeRecipient = "";
    protocol.fees = {
      mint: ethers.BigNumber.from(0),
      burn: ethers.BigNumber.from(0),
      withdraw: ethers.BigNumber.from(0),
      deposit: ethers.BigNumber.from(0)
    };
    return protocol;
  }
}
