import { BigNumber, ethers } from "ethers";
import { getTokenPegs } from "../../../utils/convert-utils";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { PSM_TO_HLP, WeightInput } from "./weights";
import psm from "./psm";
import hlpSwap from "./hlpSwap";
import HandleTokenManager from "../../TokenManager/HandleTokenManager";
import config from "../../../config";
import { HlpConfig } from "../../..";
import { RouterHpsmHlp__factory } from "../../../contracts";
import { fetchEncodedSignedQuotes } from "../../../utils/h2so-utils";
import { Pair } from "../../../types/trade";

const psmToHlpWeight = async (input: WeightInput): Promise<number> => {
  const pegs = await getTokenPegs(input.network);
  const validPeg = pegs.find(
    (peg) => peg.peggedToken.toLowerCase() === input.fromToken.address.toLowerCase()
  );
  if (!validPeg || !input.signerOrProvider) return 0; // signerOrProvider needed for psm quote
  return PSM_TO_HLP;
};

const psmToHlpQuoteHandler = async (input: ConvertQuoteRouteArgs): Promise<Quote> => {
  const pegs = await getTokenPegs(input.network);
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

  const hlpSwapQuote = await hlpSwap.quote({
    ...input,
    // ignore fee here, it is adjusted for in fee basis points returned in the quote
    sellAmount: BigNumber.from(psmQuote.buyAmount),
    fromToken: fxToken
  });

  const normalize = (n: number) => n / HlpConfig.BASIS_POINTS_DIVISOR;

  const factorAfterFee =
    (1 - normalize(psmQuote.feeBasisPoints)) * (1 - normalize(hlpSwapQuote.feeBasisPoints));

  // To get fee factor, take 1-factorAfterFee.
  // basis points is this value * BASIS_POINTS_DIVISOR
  const adjustedFeeBasisPoints = Math.round((1 - factorAfterFee) * HlpConfig.BASIS_POINTS_DIVISOR);

  return {
    sellAmount: psmQuote.sellAmount,
    buyAmount: hlpSwapQuote.buyAmount,
    allowanceTarget: config.protocol.arbitrum.protocol.routerHpsmHlp,
    feeBasisPoints: adjustedFeeBasisPoints,
    feeChargedBeforeConvert: false,
    gas: config.convert.gasEstimates.hpsmToHlp
  };
};

const psmToHlpTransactionHandler = async (
  input: ConvertTransactionRouteArgs
): Promise<ethers.PopulatedTransaction> => {
  const address = config.protocol.arbitrum.protocol.routerHpsmHlp;
  const routerHpsmHlp = RouterHpsmHlp__factory.connect(address, input.signer);

  const pegs = await getTokenPegs(input.network);
  const validPeg = pegs.find(
    (peg) => peg.peggedToken.toLowerCase() === input.fromToken.address.toLowerCase()
  );
  if (!validPeg) throw new Error("No Valid Peg");

  const minOut = input.sellAmount
    .mul(input.slippage * HlpConfig.BASIS_POINTS_DIVISOR)
    .div(HlpConfig.BASIS_POINTS_DIVISOR);

  const TokenManager = new HandleTokenManager();
  const fxToken = TokenManager.getTokenByAddress(validPeg.fxToken, input.network);
  if (!fxToken) throw new Error("Could not find fxToken");

  const pairs: Pair[] = [
    {
      baseSymbol: fxToken.symbol,
      quoteSymbol: "USD"
    },
    {
      baseSymbol: input.toToken.symbol,
      quoteSymbol: "USD"
    }
  ];

  const { encoded } = await fetchEncodedSignedQuotes(pairs);

  if (input.toToken.extensions?.isNative) {
    return routerHpsmHlp.populateTransaction.swapPeggedTokenToEth(
      input.fromToken.address,
      validPeg.fxToken,
      input.sellAmount,
      minOut,
      input.receivingAccount,
      encoded
    );
  }

  return routerHpsmHlp.populateTransaction.swapPeggedTokenToHlpToken(
    input.fromToken.address,
    validPeg.fxToken,
    input.toToken.address,
    input.sellAmount,
    minOut,
    input.receivingAccount,
    encoded
  );
};

export default {
  weight: psmToHlpWeight,
  quote: psmToHlpQuoteHandler,
  transaction: psmToHlpTransactionHandler
};
