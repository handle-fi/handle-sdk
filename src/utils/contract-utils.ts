import { ethers } from "ethers";
import {
  Contract as MultiCallContract,
  ContractCall,
  Provider as MultiCallProvider
} from "ethers-multicall";
import {
  ERC20,
  Handle,
  VaultLibrary,
  Comptroller,
  FxKeeperPool,
  Handle__factory,
  VaultLibrary__factory,
  Comptroller__factory,
  Treasury__factory,
  GovernanceLock,
  RewardPool
} from "../contracts";
import handleAbi from "../abis/handle/Handle.json";
import vaultLibraryAbi from "../abis/handle/VaultLibrary.json";
import comptrollerAbi from "../abis/handle/Comptroller.json";
import fxKeeperPoolAbi from "../abis/handle/FxKeeperPool.json";
import governanceLockAbi from "../abis/handle/GovernanceLock.json";
import rewardPoolAbi from "../abis/handle/RewardPool.json";
import erc20Abi from "../abis/ERC20.json";
import { ProtocolAddresses } from "../config";
import { Promisified } from "../types/general";

type ProtocolContracts = {
  handle: Handle;
  vaultLibrary: VaultLibrary;
  comptroller: Comptroller;
  fxKeeperPool: FxKeeperPool;
  governanceLock: GovernanceLock;
  rewardPool: RewardPool;
};

export const createMultiCallContract = <T>(address: string, abi: any) =>
  new MultiCallContract(address, abi as any) as unknown as T;

export const createERC20MulticallContract = (address: string) =>
  createMultiCallContract<ERC20>(address, erc20Abi);

export const createMulticallProtocolContracts = (
  protocolAddresses: ProtocolAddresses,
  chainId: number,
  signer: ethers.Signer
): { provider: MultiCallProvider; contracts: ProtocolContracts } => {
  const provider = new MultiCallProvider(signer.provider!, chainId);

  const contracts = {
    handle: createMultiCallContract<Handle>(protocolAddresses.handle, handleAbi.abi),
    vaultLibrary: createMultiCallContract<VaultLibrary>(
      protocolAddresses.vaultLibrary,
      vaultLibraryAbi.abi
    ),
    comptroller: createMultiCallContract<Comptroller>(
      protocolAddresses.comptroller,
      comptrollerAbi
    ),
    fxKeeperPool: createMultiCallContract<FxKeeperPool>(
      protocolAddresses.fxKeeperPool,
      fxKeeperPoolAbi
    ),
    governanceLock: createMultiCallContract<GovernanceLock>(
      protocolAddresses.governanceLock,
      governanceLockAbi
    ),
    rewardPool: createMultiCallContract<RewardPool>(protocolAddresses.rewardPool, rewardPoolAbi)
  };

  return { provider, contracts };
};

export const createProtocolContracts = (
  protocolAddresses: ProtocolAddresses,
  signer: ethers.Signer
) => {
  return {
    handle: Handle__factory.connect(protocolAddresses.handle, signer),
    vaultLibrary: VaultLibrary__factory.connect(protocolAddresses.vaultLibrary, signer),
    comptroller: Comptroller__factory.connect(protocolAddresses.comptroller, signer),
    treasury: Treasury__factory.connect(protocolAddresses.treasury, signer)
  };
};

export const callMulticallObject = async <T>(
  callObject: Promisified<T>,
  provider: MultiCallProvider
): Promise<T> => {
  const properties = Object.keys(callObject);
  const calls = Object.values(callObject) as ContractCall[];
  const response = await provider.all(calls);

  return properties.reduce((progress, property, index) => {
    return {
      ...progress,
      [property]: response[index]
    };
  }, {} as T);
};

export const callMulticallObjects = async <T>(
  callObjects: Promisified<T>[],
  provider: MultiCallProvider
): Promise<T[]> => {
  const calls = callObjects.reduce(
    (progress, callObject) => [...progress, ...(Object.values(callObject) as ContractCall[])],
    [] as ContractCall[]
  );

  const response = await provider.all(calls);
  return multicallResponsesToObjects(Object.keys(callObjects[0]), response);
};

export const multicallResponsesToObjects = <T>(properties: string[], results: any[]): T[] => {
  const objects: T[] = [];

  while (results.length > 0) {
    const data = results.splice(0, properties.length);

    const newVaultData = properties.reduce((progress, key, index) => {
      return {
        ...progress,
        [key]: data[index]
      };
    }, {} as T);

    objects.push(newVaultData);
  }
  return objects;
};
