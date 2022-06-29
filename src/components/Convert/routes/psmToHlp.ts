import { ethers } from "ethers";
import { getTokenPegs } from "../../../utils/convert-utils";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { PSM_TO_HLP, WeightInput } from "./weights";

const psmToHlpWeight = async (input: WeightInput): Promise<number> => {
  const pegs = await getTokenPegs();
  const validPeg = pegs.find(
    (peg) => peg.peggedToken.toLowerCase() === input.fromToken.address.toLowerCase()
  );
  if (!validPeg) return 0;
  return PSM_TO_HLP;
};

const psmToHlpQuoteHandler = async (input: ConvertQuoteRouteArgs): Promise<Quote> => {};

const psmToHlpTransactionHandler = (
  input: ConvertTransactionRouteArgs
): Promise<ethers.PopulatedTransaction> => {};

export default {
  weight: psmToHlpWeight,
  quote: psmToHlpQuoteHandler,
  transaction: psmToHlpTransactionHandler
};
