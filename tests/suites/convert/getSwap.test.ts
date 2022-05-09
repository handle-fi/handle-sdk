import { expect } from "chai";
// import { Network } from "../../../src";
import Convert from "../../../src/components/Convert";
import { HlpInfoMethods } from "../../../src/components/Trade/types";
import { HLP_TOKENS, PRICE_DECIMALS } from "../../../src/config/hlp";
import { getHlpToken, getNativeWrappedToken } from "../../../src/utils/hlp";
import { ethers } from "hardhat";
import { Signer, VoidSigner } from "ethers";
import { getTokenDetails } from "../../../src/utils/token-utils";
import { HlpConfig } from "../../../src";

const convert = new Convert();

const weth = getNativeWrappedToken("arbitrum")!;
const eth = HLP_TOKENS["arbitrum"].find((x) => x.isNative)!;
const hlp = getHlpToken("arbitrum")!;
const fxUsd = HLP_TOKENS["arbitrum"].find((x) => x.symbol === "fxUSD")!;
const fxAud = HLP_TOKENS["arbitrum"].find((x) => x.symbol === "fxAUD")!;

const FIVE_DOLLARS = ethers.utils.parseUnits("5", PRICE_DECIMALS);
const ONE_DOLLAR = ethers.utils.parseUnits("1", PRICE_DECIMALS);

const sampleHlpTokenMethods: HlpInfoMethods = {
  getMinPrice: () => ONE_DOLLAR,
  getMaxPrice: () => ONE_DOLLAR,
  getAveragePrice: () => ONE_DOLLAR,
  getFundingRate: () => ethers.constants.One,
  getTokenInfo: () => undefined,
  getUsdgSupply: () => ethers.constants.One,
  getTargetUsdgAmount: () => ethers.constants.One,
  getTotalTokenWeights: () => ethers.constants.One,
  getHlpPrice: () => FIVE_DOLLARS
};

let signer: Signer;

describe("convert getSwap", () => {
  before(async () => {
    signer = ethers.provider.getSigner(0);

    // Estimate gas is overriden so that getSwap does not revert for testing
    // since the testing address does not always have enough funds
    signer.estimateGas = async () => ethers.constants.Zero;
  });
  describe("WETH", () => {
    it("should return a transaction from eth to weth", async () => {
      const { tx } = await convert.getSwap({
        fromToken: eth,
        toToken: weth,
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.constants.One,
        hlpMethods: sampleHlpTokenMethods,
        buyAmount: ethers.utils.parseEther("0.01"),
        sellAmount: ethers.utils.parseEther("0.01"),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
    it("should return a transaction from weth to eth", async () => {
      const { tx } = await convert.getSwap({
        fromToken: weth,
        toToken: eth,
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        buyAmount: ethers.utils.parseEther("0.01"),
        sellAmount: ethers.utils.parseEther("0.01"),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
  });
  describe("hLP", () => {
    it("should return a transaction from hlp to a token", async () => {
      const { tx } = await convert.getSwap({
        fromToken: hlp,
        toToken: fxUsd,
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", hlp.decimals),
        buyAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
    it("should return a transaction from hlp to eth ", async () => {
      const { tx } = await convert.getSwap({
        fromToken: hlp,
        toToken: eth,
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", hlp.decimals),
        // price of eth fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", eth.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
    it("should return a transaction from a token to hlp", async () => {
      const { tx } = await convert.getSwap({
        fromToken: fxUsd,
        toToken: hlp,
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        buyAmount: ethers.utils.parseUnits("1", hlp.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
    it("should return a transaction from eth to hlp", async () => {
      const { tx } = await convert.getSwap({
        fromToken: eth,
        toToken: hlp,
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", eth.decimals),
        // price of eth fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", fxUsd.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
  });
  describe("api", () => {
    it(`should return an api swap`, async () => {
      // void signer is used as forked chain is not used by api
      const signer = new VoidSigner("0x82af49447d8a07e3bd95bd0d56f35241523fbab1", ethers.provider);
      const usdt = getTokenDetails("USDT", "arbitrum");
      const { tx } = await convert.getSwap({
        fromToken: { ...getTokenDetails("ETH", "arbitrum"), name: "Ethereum" },
        toToken: { ...usdt, name: "Tether USD" },
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", eth.decimals),
        buyAmount: ethers.utils.parseUnits("1", usdt.decimals),
        signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
  });
  describe("handle liquidity pool", () => {
    it("should return a swap for two tokens", async () => {
      const { tx } = await convert.getSwap({
        fromToken: fxUsd,
        toToken: fxAud,
        canUseHlp: true,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        // price of fxUsd / fxAud fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", fxAud.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
    it("should return a swap for a token and eth", async () => {
      const { tx } = await convert.getSwap({
        fromToken: fxUsd,
        toToken: eth,
        canUseHlp: true,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        // price of fxUsd / eth fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", eth.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
  });
  describe("HPSM", () => {
    it("should return a swap to pegged tokens", async () => {
      const usdt = getTokenDetails("USDT", "arbitrum");
      const { tx } = await convert.getSwap({
        fromToken: { ...usdt, name: "Tether USD" },
        toToken: fxUsd,
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", usdt.decimals),
        buyAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
      expect(tx.to).to.eq(HlpConfig.HLP_CONTRACTS.arbitrum?.HPSM);
    });
    it("should return a swap from pegged tokens", async () => {
      const usdt = getTokenDetails("USDT", "arbitrum");
      const { tx } = await convert.getSwap({
        toToken: { ...usdt, name: "Tether USD" },
        fromToken: fxUsd,
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signer.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        hlpMethods: sampleHlpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", usdt.decimals),
        buyAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        signer: signer,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
      expect(tx.to).to.eq(HlpConfig.HLP_CONTRACTS.arbitrum?.HPSM);
    });
  });
});
