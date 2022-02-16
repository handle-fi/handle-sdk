export type Network = "ethereum" | "arbitrum" | "polygon";
export type SingleCollateralVaultNetwork = Extract<Network, "polygon" | "arbitrum">;
export type ConvertNetwork = Network; // for now

export type NetworkMap<T> = { [key in Network]: T };
export type ConvertNetworkMap<T> = { [key in ConvertNetwork]: T };
export type SingleCollateralVaultNetworkMap<T> = { [key in SingleCollateralVaultNetwork]: T };
