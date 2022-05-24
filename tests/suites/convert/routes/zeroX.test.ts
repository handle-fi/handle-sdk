import { expect } from "chai";
import { ethers } from "ethers";
import { Network } from "../../../../src";
import Convert from "../../../../src/components/Convert";
import { getTokenDetails } from "../../../../src/utils/token-utils";
import { sampleHlpTokenMethods } from "../sampleHlpTokenMethods";

describe("zeroX route", () => {
  describe("quote", () => {
    (["ethereum", "polygon"] as Network[]).forEach((network) => {
      it(`should return an api quote for ${network}`, async () => {
        const usdc = getTokenDetails("USDC", network);
        const usdt = getTokenDetails("USDT", network);
        const quote = await Convert.getQuote({
          fromToken: { ...usdc, name: "" },
          toToken: { ...usdt, name: "" },
          network,
          connectedAccount: ethers.constants.AddressZero,
          fromAmount: ethers.utils.parseEther("1"),
          gasPrice: ethers.constants.One,
          hlpMethods: sampleHlpTokenMethods
        });
        expect(quote).to.have.property("buyAmount");
        expect(quote).to.have.property("sellAmount");
        expect(!!quote.feeChargedBeforeConvert).to.be.false;
      });
    });
  });
});
