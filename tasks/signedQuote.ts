import { task } from "hardhat/config";
import {pairFromString} from "../src/utils/general-utils";
import {fetchEncodedSignedQuotes} from "../src/utils/h2so-utils";
import {Vault__factory, VaultPriceFeed__factory} from "../src/contracts";
import {HLP_CONTRACTS} from "../src/config/hlp";
import {Wallet} from "ethers";

task("fetch-signed-quote")
  .addParam("pairs")
  .setAction(async ({ pairs }, _hre) => {
    pairs = pairs.split(",");
    const { encoded } = await fetchEncodedSignedQuotes(pairs.map(pairFromString));
    console.log("data: ", encoded);
  });

task("try-submit-signed-quote")
  .addParam("pairs")
  .addParam("privatekey")
  .setAction(async ({ pairs, privatekey }, hre) => {
    pairs = pairs.split(",");
    const data = await fetchEncodedSignedQuotes(pairs.map(pairFromString));
    console.log("data: ", data);
    const vault = Vault__factory.connect(
      HLP_CONTRACTS.arbitrum?.Vault!,
      hre.ethers.provider
    );
    const vaultPriceFeed = VaultPriceFeed__factory.connect(
      await vault.priceFeed(),
      new Wallet(privatekey, hre.ethers.provider)
    );
    await vaultPriceFeed.h2sofaApplySignedQuote(data.encoded);
  });
