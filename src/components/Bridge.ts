import axios from "axios";
import { ethers } from "ethers";
import { FxTokenAddresses } from "../config";
import sdkConfig from "../config";
import { FxTokenSymbol, Network, NetworkMap } from "..";
import { Bridge__factory, ERC20__factory } from "../contracts";
import { DepositEvent } from "../contracts/Bridge";
import { getFxTokenSymbolFromAddress } from "../utils/fxToken-utils";

export type BridgeConfigByNetwork = NetworkMap<{ address: string; id: number }>;

export type BridgeToken = FxTokenSymbol | "FOREX";

export type BridgeConfig = {
  apiBaseUrl: string;
  byNetwork: BridgeConfigByNetwork;
  forexAddress: string;
  fxTokenAddresses: FxTokenAddresses;
};

export type BridgeDepositArguments = {
  fromNetwork: Network;
  toNetwork: Network;
  tokenSymbol: BridgeToken;
  amount: ethers.BigNumber;
};

export type BridgeWithdrawArguments = {
  tokenSymbol: BridgeToken;
  amount: ethers.BigNumber;
  nonce: ethers.BigNumber;
  fromNetwork: Network;
  toNetwork: Network;
  signature: string;
};

export type BridgeGetNonceArguments = {
  fromNetwork: Network;
  toNetwork: Network;
};

type DepositEventData = DepositEvent["args"] & {
  txHash: string;
};

export type PendingWithdrawal = {
  txHash: string;
  tokenSymbol: BridgeToken;
  amount: ethers.BigNumber;
  nonce: ethers.BigNumber;
  fromNetwork: Network;
  toNetwork: Network;
};

export default class Bridge {
  public config: BridgeConfig;

  constructor(c?: BridgeConfig) {
    this.config = c || {
      apiBaseUrl: sdkConfig.bridge.apiBaseUrl,
      forexAddress: sdkConfig.forexAddress,
      byNetwork: sdkConfig.bridge.byNetwork,
      fxTokenAddresses: sdkConfig.fxTokenAddresses
    };
  }
  public deposit(
    args: BridgeDepositArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public deposit(
    args: BridgeDepositArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public deposit(
    args: BridgeDepositArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const bridgeContract = this.getBridgeContract(args.fromNetwork, signer);
    const tokenAddress = this.getTokenAddress(args.tokenSymbol);
    const contract = populateTransaction ? bridgeContract.populateTransaction : bridgeContract;

    return contract.deposit(
      tokenAddress,
      args.amount,
      this.config.byNetwork[args.toNetwork].id,
      options
    );
  }

  public withdraw(
    args: BridgeWithdrawArguments,
    signer: ethers.Signer,
    populateTransaction?: false,
    options?: ethers.Overrides
  ): Promise<ethers.ContractTransaction>;
  public withdraw(
    args: BridgeWithdrawArguments,
    signer: ethers.Signer,
    populateTransaction?: true,
    options?: ethers.Overrides
  ): Promise<ethers.PopulatedTransaction>;
  public async withdraw(
    args: BridgeWithdrawArguments,
    signer: ethers.Signer,
    populateTransaction: boolean = false,
    options: ethers.Overrides = {}
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const bridgeContract = this.getBridgeContract(args.toNetwork, signer);
    const tokenAddress = this.getTokenAddress(args.tokenSymbol);
    const contract = populateTransaction ? bridgeContract.populateTransaction : bridgeContract;
    const address = await signer.getAddress();
    return contract.withdraw(
      address,
      tokenAddress,
      args.amount,
      args.nonce,
      this.config.byNetwork[args.fromNetwork].id,
      ethers.utils.arrayify(args.signature),
      options
    );
  }

  public getDepositAllowance = (
    account: string,
    token: BridgeToken,
    network: Network,
    signer: ethers.Signer
  ): Promise<ethers.BigNumber> => {
    const tokenAddress = this.getTokenAddress(token);
    const bridgeAddress = this.config.byNetwork[network].address;
    const contract = ERC20__factory.connect(tokenAddress, signer);
    return contract.allowance(account, bridgeAddress);
  };

  public setDepositAllowance(
    token: BridgeToken,
    network: Network,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    populateTransaction?: false
  ): Promise<ethers.ContractTransaction>;
  public setDepositAllowance(
    token: BridgeToken,
    network: Network,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    populateTransaction?: true
  ): Promise<ethers.PopulatedTransaction>;
  public setDepositAllowance(
    token: BridgeToken,
    network: Network,
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    populateTransaction: boolean = false
  ): Promise<ethers.ContractTransaction | ethers.PopulatedTransaction> {
    const tokenAddress = this.getTokenAddress(token);
    const bridgeAddress = this.config.byNetwork[network].address;
    const tokenContract = ERC20__factory.connect(tokenAddress, signer);
    const contract = populateTransaction ? tokenContract.populateTransaction : tokenContract;
    return contract.approve(bridgeAddress, amount);
  }

  public getPendingWithdrawals = async (
    account: string,
    signers: NetworkMap<ethers.Signer>
  ): Promise<PendingWithdrawal[]> => {
    const depositEventPromises = Object.keys(signers).map((n) => {
      const network = n as Network;
      return this.getPendingWithdrawsForNetwork(account, network, signers);
    });

    const results = await Promise.all(depositEventPromises);
    return results.reduce((acc, curr) => [...acc, ...curr], []);
  };

  public getWithdrawSignature = async (network: Network, txHash: string) => {
    const { data } = await axios.get(
      `${this.config.apiBaseUrl}/sign?network=${network}&transactionHash=${txHash}`
    );
    return data.signature;
  };

  public getWithdrawNonce = async (
    args: BridgeGetNonceArguments,
    signer: ethers.Signer
  ): Promise<ethers.BigNumber> => {
    const bridgeContract = this.getBridgeContract(args.toNetwork, signer);
    const account = await signer.getAddress();
    return bridgeContract.withdrawNonce(account, this.config.byNetwork[args.fromNetwork].id);
  };

  private getPendingWithdrawsForNetwork = async (
    account: string,
    network: Network,
    signers: NetworkMap<ethers.Signer>
  ): Promise<PendingWithdrawal[]> => {
    const signer = signers[network];
    const bridgeContract = this.getBridgeContract(network, signer);
    const fromBlock =
      network === "polygon" ? (await signer.provider!.getBlockNumber()) - 1990 : undefined;

    const filter = bridgeContract.filters.Deposit(account);

    const rawEvents = await bridgeContract.queryFilter(filter, fromBlock);

    const events: DepositEventData[] = rawEvents.map((event) => {
      return {
        txHash: event.transactionHash,
        ...(bridgeContract.interface.parseLog(event).args as unknown as DepositEvent["args"])
      };
    });

    const eventsByNetwork = events.reduce((progress, event) => {
      const property = this.bridgeIdToNetwork(event.toId.toNumber());
      const values = progress[property] || [];
      return {
        ...progress,
        [property]: [...values, event]
      };
    }, {} as Partial<NetworkMap<DepositEventData[]>>);

    const networksWithEvents = Object.keys(eventsByNetwork) as Network[];

    const withdrawCounts = await Promise.all(
      networksWithEvents
        .filter((n) => n !== network)
        .map((n) => {
          const bc = this.getBridgeContract(n, signers[n]);
          return bc.withdrawNonce(account, this.config.byNetwork[network].id);
        })
    );

    const withdrawCountsByNetwork = withdrawCounts.reduce((progress, count, index) => {
      return {
        ...progress,
        [networksWithEvents[index]]: Number(count.toString())
      };
    }, {} as Partial<NetworkMap<number>>);

    const pendingWithdraws = networksWithEvents.reduce((progress, network) => {
      const events = eventsByNetwork[network];
      const depositCount = events?.length || 0;
      const withdrawCount = withdrawCountsByNetwork[network || 0];
      const pendingCount = depositCount - (withdrawCount || 0);

      const pendingEvents = events?.slice(events.length - pendingCount, events.length) || [];

      return [...progress, ...pendingEvents];
    }, [] as DepositEventData[]);

    return pendingWithdraws.map((pw) => ({
      txHash: pw.txHash,
      tokenSymbol: this.getTokenSymbolFromAddress(pw.token),
      amount: pw.amount,
      nonce: pw.nonce,
      fromNetwork: this.bridgeIdToNetwork(pw.fromId.toNumber()),
      toNetwork: this.bridgeIdToNetwork(pw.toId.toNumber())
    }));
  };

  private getTokenAddress = (token: BridgeToken) => {
    const tokenAddress =
      token === "FOREX" ? this.config.forexAddress : this.config.fxTokenAddresses[token];

    if (!tokenAddress) {
      throw new Error(`Invalid token symbol: ${token}`);
    }

    return tokenAddress;
  };

  private getTokenSymbolFromAddress = (tokenAddress: string): BridgeToken => {
    if (tokenAddress === this.config.forexAddress) {
      return "FOREX";
    }

    return getFxTokenSymbolFromAddress(tokenAddress, this.config.fxTokenAddresses);
  };

  private getBridgeContract = (network: Network, signer: ethers.Signer) => {
    return Bridge__factory.connect(this.config.byNetwork[network].address, signer);
  };

  private bridgeIdToNetwork = (bridgeId: number): Network => {
    const networkNames = Object.keys(this.config.byNetwork);
    const ids = Object.values(this.config.byNetwork).map((x) => x.id);
    const index = ids.indexOf(bridgeId);
    return networkNames[index] as Network;
  };
}