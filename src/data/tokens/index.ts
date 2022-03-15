import { TokenExtended } from "../..//types/tokens";
import ethereumTokenList from "./ethereum-tokens.json";
import arbitrumTokenList from "./arbitrum-tokens.json";
import polygonTokenList from "./polygon-tokens.json";
import handleTokenList from "./handle-tokens.json";

export const ETHEREUM_TOKEN_LIST = [
  ...handleTokenList,
  ...ethereumTokenList
] as TokenExtended<string>[];
export const ARBITRUM_TOKEN_LIST = [
  ...handleTokenList,
  ...arbitrumTokenList
] as TokenExtended<string>[];
export const POLYGON_TOKEN_LIST = [
  ...handleTokenList,
  ...polygonTokenList
] as TokenExtended<string>[];
