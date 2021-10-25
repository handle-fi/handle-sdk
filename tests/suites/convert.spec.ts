import { describe, it } from "@jest/globals";
import { Convert } from "../../src";
import { ethers } from "ethers";
import { Config } from "../../src/types/Config";
import homesteadTokens from "../../tokens/homestead.json";
import polygonTokens from "../../tokens/polygon.json";

const ZDRO_FEE = 0;
const SAME_CURRENCY_STABLE_TO_SAME_CURRENCY_STABLE_FEE = 0.04;
const NON_STABLE_FEE = 0.3;

let convert: Convert;

describe("Convert", function () {
  beforeAll(async () => {
    convert = new Convert("homestead");
  });

  it("Should return a list of tokens", async () => {
    const tokens = await convert.getTokens();
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("Should return different tokens when the network changes", async () => {
    const SECOND_NETWORK = "polygon";

    const networkOneTokens = await convert.getTokens();

    if (process.env.NETWORK === SECOND_NETWORK) {
      throw new Error("ENV network is the same as SECOND_NETWORK");
    }

    const secondConvert = new Convert(SECOND_NETWORK);

    const networkTwoTokens = await secondConvert.getTokens();

    expect(networkOneTokens.length !== networkTwoTokens.length).toBeTruthy();
  });

  it("Should fetch price data for a trade", async () => {
    const priceResult = await convert.getQuote(
      "ETH",
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      ethers.utils.parseEther("1"),
      undefined,
      "1",
      "0x924CF7da1ecec313471ea16E8C58a3141f094546"
    );
    expect(priceResult.buyAmount).toBeTruthy();
  });

  it("should return zero fee when trading on mainnet except when selling FOREX", async () => {
    const usdc = homesteadTokens.find((t) => t.symbol === "USDC")!;
    const usdt = homesteadTokens.find((t) => t.symbol === "USDT")!;
    const eurs = homesteadTokens.find((t) => t.symbol === "EURS")!;

    const sameStable = await convert.getFeeAsPercentage(usdc.address, usdt.address);
    const differentStable = await convert.getFeeAsPercentage(usdc.address, eurs.address);
    const buyingForex = await convert.getFeeAsPercentage(usdc.address, Config.forexTokenAddress);
    const sellingForex = await convert.getFeeAsPercentage(Config.forexTokenAddress, usdc.address);

    expect(sameStable).toBe(ZDRO_FEE);
    expect(differentStable).toBe(ZDRO_FEE);
    expect(buyingForex).toBe(ZDRO_FEE);
    expect(sellingForex).toBe(NON_STABLE_FEE);
  });
  it("should return the correct fees when trading on polygon", async () => {
    const polyConvert = new Convert("polygon");

    // polyon doesnt appear to have any non usd stables so we dont test for stable to stable

    const usdc = polygonTokens.find((t) => t.symbol === "USDC")!;
    const usdt = polygonTokens.find((t) => t.symbol === "USDT")!;

    const sameStable = await polyConvert.getFeeAsPercentage(usdc.address, usdt.address);
    const buyingForex = await polyConvert.getFeeAsPercentage(
      usdc.address,
      Config.forexTokenAddress
    );
    const sellingForex = await polyConvert.getFeeAsPercentage(
      Config.forexTokenAddress,
      usdc.address
    );

    expect(sameStable).toBe(SAME_CURRENCY_STABLE_TO_SAME_CURRENCY_STABLE_FEE);
    expect(buyingForex).toBe(ZDRO_FEE);
    expect(sellingForex).toBe(NON_STABLE_FEE);
  });
});
