import { expect } from "chai";
import { ethers } from "ethers";
import { Network } from "../../../../src";
import Convert from "../../../../src/components/Convert";
import { testTokenList } from "../../../mock-data/token-config";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";

describe("zeroX route", () => {
  describe("quote", () => {
    (["ethereum", "polygon"] as Network[]).forEach((network) => {
      it(`should return an api quote for ${network}`, async () => {
        const usdc = testTokenList.getTokenBySymbol("USDC", network)!;
        const usdt = testTokenList.getTokenBySymbol("USDT", network)!;
        const quote = await Convert.getQuote({
          fromToken: usdc,
          toToken: usdt,
          receivingAccount: ethers.constants.AddressZero,
          sellAmount: ethers.utils.parseEther("1"),
          gasPrice: ethers.constants.One,
          hlpMethods: sampleHlpTokenMethods
        });
        expect(quote).to.have.property("buyAmount");
        expect(quote).to.have.property("sellAmount");
        expect(quote.feeChargedBeforeConvert).to.be.false;
      });
    });
  });
});
