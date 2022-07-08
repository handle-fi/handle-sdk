import { BigNumber, ethers } from "ethers";
import { getPsmToHlpToCurvePath, getTokenPegs, Path } from "../../../utils/convert-utils";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs, Quote } from "../Convert";
import { PSM_TO_HLP_TO_CURVE, WeightInput } from "./weights";
import psmToHlp from "./psmToHlp";
import HandleTokenManager from "../../TokenManager/HandleTokenManager";
import config from "../../../config";
import { HlpConfig, Network } from "../../..";
import { RouterHpsmHlp__factory } from "../../../contracts";
import { fetchEncodedSignedQuotes } from "../../../utils/h2so-utils";
import { Pair } from "../../../types/trade";
import { CurveMetapoolFactory__factory } from "../../../contracts/factories/CurveMetapoolFactory__factory";
import { CurveMetapool__factory } from "../../../contracts/factories/CurveMetapool__factory";

const cache: Record<string, Path> = {};

const getPsmToHlpToCurvePathFromCache = async (
  from: string,
  to: string,
  network: Network,
  signerOrProvider: ethers.Signer | ethers.providers.Provider
): Promise<Path> => {
  if (cache[from + to + network]) return cache[from + to + network];
  return getPsmToHlpToCurvePath(from, to, network, signerOrProvider);
};

const psmToHlpToCurveWeight = async (input: WeightInput): Promise<number> => {
  if (!input.signerOrProvider) return 0; // must have signer to check curve pool

  const path = getPsmToHlpToCurvePathFromCache(
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
  const tokenManager = new HandleTokenManager();
  const path = await getPsmToHlpToCurvePathFromCache(
    input.fromToken.address,
    input.toToken.address,
    input.network,
    input.signerOrProvider
  );
  if (!path) throw new Error("No path available");

  const intermediateToken = tokenManager.getTokenByAddress(path.hlpToken, input.network);
  if (!intermediateToken) throw new Error("No intermediate token");

  const psmToHlpQuote = await psmToHlp.quote({
    ...input,
    toToken: intermediateToken
  });

  const metapoolFactory = CurveMetapoolFactory__factory.connect(
    path.factory,
    input.signerOrProvider
  );

  const [fromIndex, toIndex, useUnderlying] = await metapoolFactory.get_coin_indices(
    path.pool,
    path.hlpToken,
    path.curveToken
  );

  let amountOutPromise: Promise<BigNumber>;
  const pool = CurveMetapool__factory.connect(path.pool, input.signerOrProvider);
  if (useUnderlying) {
    amountOutPromise = pool.get_dy_underlying(fromIndex, toIndex, psmToHlpQuote.buyAmount);
  } else {
    amountOutPromise = pool.get_dy(fromIndex, toIndex, psmToHlpQuote.buyAmount);
  }

  const feesPromise = pool.fee();

  const [amountOut, fees] = await Promise.all([amountOutPromise, feesPromise]);
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
