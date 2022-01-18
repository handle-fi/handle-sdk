export type Network = "ethereum" | "arbitrum" | "polygon";
export type NetworkMap<T> = { [key in Network]: T };
