import dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";
import { SDK } from "../src/types/SDK";

if (process.env.PRIVATE_KEY == null) throw new Error("PRIVATE_KEY env variable not set");

if (process.env.NETWORK == null) throw new Error("NETWORK env variable not set");

if (process.env.INFURA_KEY == null) throw new Error("INFURA_KEY env variable not set");

jest.setTimeout(240000);

let signer: ethers.Signer;
let sdk: SDK;

export const getSDK = () => sdk;
export const getSigner = () => signer;

global.beforeAll(async () => {
  // @ts-config
  signer = new ethers.Wallet(
    // @ts-ignore
    process.env.PRIVATE_KEY,
    new ethers.providers.InfuraWebSocketProvider(process.env.NETWORK, process.env.INFURA_KEY)
  );
  sdk = await SDK.from(signer);
});

global.afterAll(() => {
  // @ts-ignore
  signer.provider._websocket.terminate();
  // @ts-ignore
  signer = null;
});
