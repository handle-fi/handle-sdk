export type Network = "ethereum" | "arbitrum" | "polygon";
export type SingleCollateralVaultNetwork = Extract<Network, "polygon" | "arbitrum">;
export type NetworkMap<T> = { [key in Network]: T };
export type SingleCollateralVaultNetworkMap<T> = { [key in SingleCollateralVaultNetwork]: T };
