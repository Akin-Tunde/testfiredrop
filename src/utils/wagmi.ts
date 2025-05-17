import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

const alchemyApiKey = import.meta.env.VITE_ALCHEMY_API_KEY!;

export const config = createConfig({
  chains: [base],
  connectors: [farcasterFrame(), injected(),
    metaMask()
  ],
  
  transports: {
    [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
  },
});

export const chains = [base];
