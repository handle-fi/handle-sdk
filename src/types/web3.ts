export type Network = "ethereum" | "arbitrum" | "polygon";
export type SingleCollateralVaultNetwork = Extract<Network, "polygon">;
export type NetworkMap<T> = { [key in Network]: T };
