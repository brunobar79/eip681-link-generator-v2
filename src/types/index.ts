export interface Chain {
  name: string;
  chain: string;
  icon?: string;
  rpc: Array<{
    url: string;
    tracking?: string;
    isOpenSource?: boolean;
  }>;
  features?: Array<{
    name: string;
  }>;
  faucets: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  infoURL?: string;
  shortName: string;
  chainId: number;
  networkId: number;
  explorers?: Array<{
    name: string;
    url: string;
    standard?: string;
  }>;
  parent?: {
    type: string;
    chain: string;
    bridges?: string[];
  };
  title?: string;
}

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: number;
  iconUrl?: string;
  logoURI?: string;
}

export interface EIP681Params {
  chainId?: number;
  address: string;
  functionName?: string;
  value?: string;
  gas?: string;
  gasLimit?: string;
  gasPrice?: string;
  parameters?: Record<string, string>;
}

export interface TransactionFormData {
  chainId: number;
  toAddress: string;
  value?: string;
  tokenAddress?: string;
  tokenAmount?: string;
  gasLimit?: string;
  gasPrice?: string;
  data?: string;
}

export interface FormErrors {
  chainId?: string;
  toAddress?: string;
  value?: string;
  tokenAddress?: string;
  tokenAmount?: string;
  gasLimit?: string;
  gasPrice?: string;
  data?: string;
} 