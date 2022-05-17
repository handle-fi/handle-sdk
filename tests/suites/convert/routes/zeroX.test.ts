import { expect } from "chai";
import { ethers } from "ethers";
import { Network } from "../../../../src";
import Convert from "../../../../src/components/Convert";
import { tokenList } from "../../../mock-data/token-list";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";

describe("zeroX route", () => {
  describe("quote", () => {
    (["ethereum", "polygon"] as Network[]).forEach((network) => {
      it(`should return an api quote for ${network}`, async () => {
        const usdc = tokenList.getTokenBySymbol("USDC", network);
        const usdt = tokenList.getTokenBySymbol("USDT", network);
        const quote = await Convert.getQuote({
          fromToken: usdc,
          toToken: usdt,
          network,
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.utils.parseEther("1"),
          gasPrice: ethers.constants.One,
          hlpMethods: sampleHlpTokenMethods,
          tokenList: tokenList.getLoadedTokens()
        });
        expect(quote).to.have.property("buyAmount");
        expect(quote).to.have.property("sellAmount");
      });
    });
  });
});
