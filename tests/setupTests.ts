import dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";
import { SDK } from "../src/types/SDK";

jest.setTimeout(240000);

let signer: ethers.Signer;
let sdk: SDK;

export const getSDK = () => sdk;

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
