import { BigNumber, ethers } from "ethers";
import { getTokenPegs, isValidCurvePoolSwap } from "../../../utils/convert-utils";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { PSM_TO_HLP_TO_CURVE, WeightInput } from "./weights";
import psmToHlp from "./psmToHlp";
import HandleTokenManager from "../../TokenManager/HandleTokenManager";
import config from "../../../config";
import { HlpConfig, Network, TokenInfo } from "../../..";
import { RouterHpsmHlp__factory } from "../../../contracts";
import { fetchEncodedSignedQuotes } from "../../../utils/h2so-utils";
import { Pair } from "../../../types/trade";

const getPsmToHlpToCurvePath = async (
  from: string,
  to: string,
  network: Network,
  signerOrProvider: ethers.Signer | ethers.providers.Provider
): Promise<[string, string, string, string] | null> => {
  const pegs = await getTokenPegs(network);
  const validPeg = pegs.find((peg) => peg.peggedToken.toLowerCase() === from.toLowerCase());
  if (!validPeg) return null;

  const curvePool = Object.values(config.lpStaking.arbitrum).find((pool) => {
    return !!pool.factoryAddress && pool.platform === "curve";
  });
  if (!curvePool) return null;

  const metaToken = curvePool.tokensInLp.find(
    (token) => token.address.toLowerCase() !== validPeg.fxToken.toLowerCase()
  );
  const hlpToken = curvePool.tokensInLp.find(
    (token) => token.address.toLowerCase() === validPeg.fxToken.toLowerCase()
  );
  if (!metaToken || !hlpToken) return null; // this probably shouldn't happen

  const isValid = await isValidCurvePoolSwap(
    curvePool.lpToken.address,
    curvePool.factoryAddress!,
    network,
    hlpToken.address,
    to,
    signerOrProvider
  );

  return isValid ? [from, validPeg.fxToken, hlpToken.address, to] : null;
};

const psmToHlpToCurveWeight = async (input: WeightInput): Promise<number> => {
  if (!input.signerOrProvider) return 0; // must have signer to check curve pool

  const path = getPsmToHlpToCurvePath(
    input.fromToken.address,
    input.toToken.address,
    input.network,
    input.signerOrProvider
  );
  if (!path) return 0;
  return PSM_TO_HLP_TO_CURVE;
};

const psmToHlpToCurveQuoteHandler = async (input: ConvertQuoteRouteArgs): Promise<Quote> => {
  if (!input.signerOrProvider) throw new Error("signer / provider required for quote");
  const path = getPsmToHlpToCurvePath(
    input.fromToken.address,
    input.toToken.address,
    input.network,
    input.signerOrProvider
  );

  if (!path) throw new Error("No path available");
};

const psmToHlpToCurveTransactionHandler = async (
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
  weight: psmToHlpToCurveWeight,
  quote: psmToHlpToCurveQuoteHandler,
  transaction: psmToHlpToCurveTransactionHandler
};
