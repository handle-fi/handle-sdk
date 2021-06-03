import { ethers } from "ethers";
import dotenv from "dotenv";

let signer: ethers.Signer;

export const getSigner = () => signer;

global.beforeAll(() => {
  dotenv.config();
  // @ts-config
  signer = new ethers.Wallet(
    // @ts-ignore
    process.env.PRIVATE_KEY,
    new ethers.providers.InfuraWebSocketProvider(process.env.NETWORK, process.env.INFURA_KEY)
  );
});

global.afterAll(() => {
  // @ts-ignore
  signer.provider._websocket.terminate();
  // @ts-ignore
  signer = null;
});
