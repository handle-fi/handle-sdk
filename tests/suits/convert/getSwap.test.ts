import { expect } from "chai";
// import { Network } from "../../../src";
import Convert from "../../../src/components/Convert";
import { PerpInfoMethods } from "../../../src/components/Trade/types";
import { PERP_CONTRACTS, PERP_TOKENS, PRICE_DECIMALS } from "../../../src/perp-config";
import { getHlpToken, getNativeWrappedToken } from "../../../src/utils/perp";
// @ts-ignore ethers context is injected in hardhat config
import { ethers } from "hardhat";
import {
  GlpManager__factory,
  HlpManagerRouter__factory,
  WETH__factory
} from "../../../src/contracts";
import { Signer, VoidSigner } from "ethers";
import { getTokenDetails } from "../../../src/utils/token-utils";

const convert = new Convert();

const weth = getNativeWrappedToken("arbitrum")!; // arbitrum
const eth = PERP_TOKENS["arbitrum"].find((x) => x.isNative)!;
const hlp = getHlpToken("arbitrum");
const fxUsd = PERP_TOKENS["arbitrum"].find((x) => x.symbol === "fxUSD")!;
const fxAud = PERP_TOKENS["arbitrum"].find((x) => x.symbol === "fxAUD")!;

const FIVE_DOLLARS = ethers.utils.parseUnits("5", PRICE_DECIMALS);
const ONE_DOLLAR = ethers.utils.parseUnits("1", PRICE_DECIMALS);

const samplePerpTokenMethods: PerpInfoMethods = {
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

let signerWithAssets: Signer;

describe("convert getSwap", () => {
  before(async () => {
    const signer = ethers.provider.getSigner(0);
    signerWithAssets = signer;
    const weth = WETH__factory.connect(getNativeWrappedToken()?.address!, signer);
    // gives signer weth
    await weth.deposit({
      value: ethers.utils.parseEther("1")
    });
    const hlpManagerRouter = HlpManagerRouter__factory.connect(
      PERP_CONTRACTS["arbitrum"].HlpManagerRouter,
      signer
    );
    const hlpManager = GlpManager__factory.connect(PERP_CONTRACTS["arbitrum"].HlpManager, signer);
    // gives signer hlp
    await hlpManagerRouter.addLiquidityETH(0, 0, {
      value: ethers.utils.parseEther("2")
    });
    // gives signer fxusd
    await hlpManager.removeLiquidity(
      fxUsd.address,
      ethers.utils.parseUnits("1000", PRICE_DECIMALS),
      0,
      await signerWithAssets.getAddress()
    );
  });
  describe("WETH", () => {
    it("should return a transaction from eth to weth", async () => {
      const { tx } = await convert.getSwap({
        fromToken: eth,
        toToken: weth,
        canUseHlp: false,
        network: "arbitrum",
        connectedAccount: await signerWithAssets.getAddress(),
        gasPrice: ethers.constants.One,
        perpInfo: samplePerpTokenMethods,
        buyAmount: ethers.utils.parseEther("0.01"),
        sellAmount: ethers.utils.parseEther("0.01"),
        signer: signerWithAssets,
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
        connectedAccount: await signerWithAssets.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        perpInfo: samplePerpTokenMethods,
        buyAmount: ethers.utils.parseEther("0.01"),
        sellAmount: ethers.utils.parseEther("0.01"),
        signer: signerWithAssets,
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
        connectedAccount: await signerWithAssets.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        perpInfo: samplePerpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", hlp.decimals),
        buyAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        signer: signerWithAssets,
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
        connectedAccount: await signerWithAssets.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        perpInfo: samplePerpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", hlp.decimals),
        // price of eth fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", eth.decimals),
        signer: signerWithAssets,
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
        connectedAccount: await signerWithAssets.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        perpInfo: samplePerpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        buyAmount: ethers.utils.parseUnits("1", hlp.decimals),
        signer: signerWithAssets,
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
        connectedAccount: await signerWithAssets.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        perpInfo: samplePerpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", eth.decimals),
        // price of eth fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", fxUsd.decimals),
        signer: signerWithAssets,
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
        perpInfo: samplePerpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", eth.decimals),
        buyAmount: ethers.utils.parseUnits("1", usdt.decimals),
        signer: signer,
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
        connectedAccount: await signerWithAssets.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        perpInfo: samplePerpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        // price of fxUsd / fxAud fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", fxAud.decimals),
        signer: signerWithAssets,
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
        connectedAccount: await signerWithAssets.getAddress(),
        gasPrice: ethers.utils.parseUnits("1", "gwei"),
        perpInfo: samplePerpTokenMethods,
        sellAmount: ethers.utils.parseUnits("1", fxUsd.decimals),
        // price of fxUsd / eth fluctuates, so set buy amount to zero
        buyAmount: ethers.utils.parseUnits("0", eth.decimals),
        signer: signerWithAssets,
        slippage: 0.05
      });
      expect(tx).to.be.an("object");
    });
  });
});
