import { ethers } from "ethers";
import { Quote } from "..";
import { ConvertQuoteRouteArgs, ConvertTransactionRouteArgs } from "../Convert";
import hlpBuyRemove from "./hlpAddRemove";
import hlpSwap from "./hlpSwap";
import oneInch from "./oneInch";
import psm from "./psm";
import { WeightInput } from "./weights";
import weth from "./weth";
import zeroX from "./zeroX";
import psmToHlp from "./psmToHlp";

export type Route = {
  weight: (input: WeightInput) => Promise<number>;
  quote: (input: ConvertQuoteRouteArgs) => Promise<Quote>;
  transaction: (input: ConvertTransactionRouteArgs) => Promise<ethers.PopulatedTransaction>;
};

const routes: Route[] = [psm, hlpBuyRemove, hlpSwap, oneInch, zeroX, weth, psmToHlp];

export default routes;
