import { BigNumber, ethers } from "ethers";
import { getTokenPegs } from "../../../utils/convert-utils";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { PSM_TO_HLP, WeightInput } from "./weights";
import psm from "./psm";
import hlpSwap from "./hlpSwap";
import HandleTokenManager from "../../TokenManager/HandleTokenManager";

const psmToHlpWeight = async (input: WeightInput): Promise<number> => {
  const pegs = await getTokenPegs();
  const validPeg = pegs.find(
    (peg) => peg.peggedToken.toLowerCase() === input.fromToken.address.toLowerCase()
  );
  if (!validPeg) return 0;
  return PSM_TO_HLP;
};

const psmToHlpQuoteHandler = async (input: ConvertQuoteRouteArgs): Promise<Quote> => {
  const pegs = await getTokenPegs();
  const validPeg = pegs.find(
    (peg) => peg.peggedToken.toLowerCase() === input.fromToken.address.toLowerCase()
  );
  if (!validPeg) throw new Error("No Valid Peg");
  const fxToken = new HandleTokenManager().getTokenByAddress(validPeg.fxToken, input.network);
  if (!fxToken) throw new Error("No fxToken found");

  const psmQuote = await psm.quote({
    ...input,
    toToken: fxToken
  });

  return hlpSwap.quote({
    ...input,
    sellAmount: BigNumber.from(psmQuote.buyAmount),
    fromToken: fxToken
  });
};

const psmToHlpTransactionHandler = (
  input: ConvertTransactionRouteArgs
): Promise<ethers.PopulatedTransaction> => {
  return {} as any;
};

export default {
  weight: psmToHlpWeight,
  quote: psmToHlpQuoteHandler,
  transaction: psmToHlpTransactionHandler
};
