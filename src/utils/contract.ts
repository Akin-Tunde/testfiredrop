import {
  createPublicClient,
  http,
  formatEther,
  formatUnits,
  getAddress,
} from "viem";
import { base } from "viem/chains";
import { RewardType, LeaderboardEntry, PrizeDetail } from "../types/global"; // Import necessary types
import { ERC20_MINIMAL_ABI } from "./erc20";

// In src/utils/contract.ts (or a server-side specific version)
const CONTRACT_ADDRESS = (
  typeof window === "undefined"
    ? process.env.CONTRACT_ADDRESS
    : import.meta.env.VITE_CONTRACT_ADDRESS
) as `0x${string}`;

const ALCHEMY_API_KEY =
  typeof window === "undefined"
    ? process.env.ALCHEMY_API_KEY
    : import.meta.env.VITE_ALCHEMY_API_KEY;

const CONTRACT_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_wrapperAddress", type: "address", internalType: "address" },
      { name: "_linkAddress", type: "address", internalType: "address" },
      { name: "_callbackGasLimit", type: "uint32", internalType: "uint32" },
      { name: "_platformFeePercent", type: "uint16", internalType: "uint16" },
      { name: "_feeReceiver", type: "address", internalType: "address" },
    ],
    stateMutability: "nonpayable",
  },
  { type: "fallback", stateMutability: "payable" },
  { type: "receive", stateMutability: "payable" },
  {
    type: "function",
    name: "MAX_NUM_WORDS",
    inputs: [],
    outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "REQUEST_CONFIRMATIONS",
    inputs: [],
    outputs: [{ name: "", type: "uint16", internalType: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "callbackGasLimit",
    inputs: [],
    outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cancelDrop",
    inputs: [{ name: "dropId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimRefund",
    inputs: [{ name: "dropId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimedRefunds",
    inputs: [
      { name: "", type: "uint256", internalType: "uint256" },
      { name: "", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createDrop",
    inputs: [
      { name: "entryFee", type: "uint256", internalType: "uint256" },
      { name: "rewardAmount", type: "uint256", internalType: "uint256" },
      { name: "rewardToken", type: "address", internalType: "address" },
      {
        name: "rewardType",
        type: "uint8",
        internalType: "enum FireballDrop.RewardType",
      },
      { name: "rewardTokenIds", type: "uint256[]", internalType: "uint256[]" },
      { name: "maxParticipants", type: "uint256", internalType: "uint256" },
      { name: "isPaidEntry", type: "bool", internalType: "bool" },
      { name: "isManualSelection", type: "bool", internalType: "bool" },
      { name: "numWinners", type: "uint32", internalType: "uint32" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "dropCounter",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "drops",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "dropId", type: "uint256", internalType: "uint256" },
      { name: "host", type: "address", internalType: "address" },
      { name: "sponsor", type: "address", internalType: "address" },
      { name: "entryFee", type: "uint256", internalType: "uint256" },
      { name: "rewardAmount", type: "uint256", internalType: "uint256" },
      { name: "rewardToken", type: "address", internalType: "address" },
      {
        name: "rewardType",
        type: "uint8",
        internalType: "enum FireballDrop.RewardType",
      },
      { name: "maxParticipants", type: "uint256", internalType: "uint256" },
      { name: "currentParticipants", type: "uint256", internalType: "uint256" },
      { name: "isActive", type: "bool", internalType: "bool" },
      { name: "isCompleted", type: "bool", internalType: "bool" },
      { name: "isPaidEntry", type: "bool", internalType: "bool" },
      { name: "isManualSelection", type: "bool", internalType: "bool" },
      { name: "isSponsored", type: "bool", internalType: "bool" },
      { name: "numWinners", type: "uint32", internalType: "uint32" },
      { name: "fundingDeadline", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeReceiver",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "fundSponsoredGame",
    inputs: [{ name: "dropId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getBalance",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDropInfo",
    inputs: [{ name: "dropId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "host", type: "address", internalType: "address" },
      { name: "sponsor", type: "address", internalType: "address" },
      { name: "entryFee", type: "uint256", internalType: "uint256" },
      { name: "rewardAmount", type: "uint256", internalType: "uint256" },
      { name: "rewardToken", type: "address", internalType: "address" },
      {
        name: "rewardType",
        type: "uint8",
        internalType: "enum FireballDrop.RewardType",
      },
      { name: "rewardTokenIds", type: "uint256[]", internalType: "uint256[]" },
      { name: "maxParticipants", type: "uint256", internalType: "uint256" },
      { name: "currentParticipants", type: "uint256", internalType: "uint256" },
      { name: "isActive", type: "bool", internalType: "bool" },
      { name: "isCompleted", type: "bool", internalType: "bool" },
      { name: "isPaidEntry", type: "bool", internalType: "bool" },
      { name: "isManualSelection", type: "bool", internalType: "bool" },
      { name: "isSponsored", type: "bool", internalType: "bool" },
      { name: "numWinners", type: "uint32", internalType: "uint32" },
      { name: "fundingDeadline", type: "uint256", internalType: "uint256" },
      { name: "winners", type: "address[]", internalType: "address[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDropParticipants",
    inputs: [{ name: "dropId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "addresses", type: "address[]", internalType: "address[]" },
      { name: "names", type: "string[]", internalType: "string[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getDropVrfRequests",
    inputs: [{ name: "dropId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "requestIds", type: "uint256[]", internalType: "uint256[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getLinkToken",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract LinkTokenInterface",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUnfundedSponsoredDrops",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getVrfRequestDetails",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "dropId", type: "uint256", internalType: "uint256" },
      { name: "isFulfilled", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasJoinedDrop",
    inputs: [
      { name: "dropId", type: "uint256", internalType: "uint256" },
      { name: "participant", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "hasJoined", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "i_vrfV2PlusWrapper",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract IVRFV2PlusWrapper" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "joinDrop",
    inputs: [
      { name: "dropId", type: "uint256", internalType: "uint256" },
      { name: "name", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "linkAddress",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "platformFeePercent",
    inputs: [],
    outputs: [{ name: "", type: "uint16", internalType: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "rawFulfillRandomWords",
    inputs: [
      { name: "_requestId", type: "uint256", internalType: "uint256" },
      { name: "_randomWords", type: "uint256[]", internalType: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "selectWinnersManually",
    inputs: [{ name: "dropId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sponsorGame",
    inputs: [
      { name: "rewardAmount", type: "uint256", internalType: "uint256" },
      { name: "rewardToken", type: "address", internalType: "address" },
      {
        name: "rewardType",
        type: "uint8",
        internalType: "enum FireballDrop.RewardType",
      },
      { name: "rewardTokenIds", type: "uint256[]", internalType: "uint256[]" },
      { name: "maxParticipants", type: "uint256", internalType: "uint256" },
      { name: "isManualSelection", type: "bool", internalType: "bool" },
      { name: "numWinners", type: "uint32", internalType: "uint32" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updatePlatformFee",
    inputs: [{ name: "newFeePercent", type: "uint16", internalType: "uint16" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawLink",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawNative",
    inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "DropCancelled",
    inputs: [
      {
        name: "dropId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      { name: "host", type: "address", indexed: true, internalType: "address" },
      {
        name: "isPaidEntry",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "isSponsored",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "refundedAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DropCreated",
    inputs: [
      {
        name: "dropId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      { name: "host", type: "address", indexed: true, internalType: "address" },
      {
        name: "entryFee",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "rewardAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "rewardToken",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "rewardType",
        type: "uint8",
        indexed: false,
        internalType: "enum FireballDrop.RewardType",
      },
      {
        name: "rewardTokenIds",
        type: "uint256[]",
        indexed: false,
        internalType: "uint256[]",
      },
      {
        name: "maxParticipants",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "isPaidEntry",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "isManualSelection",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "numWinners",
        type: "uint32",
        indexed: false,
        internalType: "uint32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "GameFunded",
    inputs: [
      {
        name: "dropId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "sponsor",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "rewardToken",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "rewardType",
        type: "uint8",
        indexed: false,
        internalType: "enum FireballDrop.RewardType",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "GameSponsored",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "creator",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sponsor",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "rewardAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "rewardToken",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "rewardType",
        type: "uint8",
        indexed: false,
        internalType: "enum FireballDrop.RewardType",
      },
      {
        name: "rewardTokenIds",
        type: "uint256[]",
        indexed: false,
        internalType: "uint256[]",
      },
      {
        name: "maxParticipants",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "isManualSelection",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "numWinners",
        type: "uint32",
        indexed: false,
        internalType: "uint32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ParticipantJoined",
    inputs: [
      {
        name: "dropId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "participant",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      { name: "name", type: "string", indexed: false, internalType: "string" },
      {
        name: "currentParticipants",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "maxParticipants",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PlatformFeeUpdated",
    inputs: [
      {
        name: "newFeePercent",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RefundClaimed",
    inputs: [
      {
        name: "dropId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "participant",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RequestFulfilled",
    inputs: [
      {
        name: "requestId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "dropId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "randomWords",
        type: "uint256[]",
        indexed: false,
        internalType: "uint256[]",
      },
      {
        name: "payment",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RequestSent",
    inputs: [
      {
        name: "requestId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "dropId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "numWinners",
        type: "uint32",
        indexed: false,
        internalType: "uint32",
      },
      {
        name: "isManualSelection",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "WinnersSelected",
    inputs: [
      {
        name: "dropId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "winners",
        type: "address[]",
        indexed: false,
        internalType: "address[]",
      },
      {
        name: "prizeAmounts",
        type: "uint256[]",
        indexed: false,
        internalType: "uint256[]",
      },
      {
        name: "platformFee",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "OnlyVRFWrapperCanFulfill",
    inputs: [
      { name: "have", type: "address", internalType: "address" },
      { name: "want", type: "address", internalType: "address" },
    ],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
];

const publicClient = createPublicClient({
  chain: base,
  transport: http(
    ALCHEMY_API_KEY
      ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
      : undefined
  ),
});

export const getContractConfig = () => {
  if (!CONTRACT_ADDRESS) {
    console.error("Contract address not set in environment variables.");
    throw new Error("Contract address not set");
  }
  if (!CONTRACT_ABI || CONTRACT_ABI.length === 0) {
    console.error("Contract ABI not set or empty.");
    throw new Error("Contract ABI not set or invalid");
  }

  return {
    publicClient,
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
  };
};

async function getTokenInfo(
  tokenAddress: `0x${string}`
): Promise<{ decimals: number; symbol: string; name: string }> {
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    return { decimals: 18, symbol: "ETH", name: "Ethereum" };
  }
  const { publicClient } = getContractConfig();
  try {
    const [decimals, symbol, name] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_MINIMAL_ABI,
        functionName: "decimals",
      }) as Promise<number>,
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_MINIMAL_ABI,
        functionName: "symbol",
      }) as Promise<string>,
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_MINIMAL_ABI,
        functionName: "name",
      }) as Promise<string>,
    ]);
    return { decimals: Number(decimals), symbol, name };
  } catch (e) {
    console.warn(
      `Could not fetch full info for ${tokenAddress}, using defaults. Error: ${e}`
    );
    const shortAddress =
      tokenAddress.slice(0, 6) + "..." + tokenAddress.slice(-4);
    return {
      decimals: 18,
      name: `Token (${shortAddress})`,
      symbol: shortAddress.slice(0, 5),
    };
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { publicClient, address: contractAddress, abi } = getContractConfig();

  const [dropCountBigInt, platformFeePercentBigInt] = await Promise.all([
    publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "dropCounter",
    }) as Promise<bigint>,
    publicClient.readContract({
      // Fetch platform fee percentage
      address: contractAddress,
      abi,
      functionName: "platformFeePercent",
    }) as Promise<number>, // Assuming uint16 maps to number
  ]);

  const dropCount = Number(dropCountBigInt);
  const platformFeePercent = BigInt(platformFeePercentBigInt); // Convert to BigInt for calculations

  const leaderboardMap: Record<
    string,
    { wins: number; prizes: PrizeDetail[] }
  > = {};

  for (let i = 0; i < dropCount; i++) {
    const dropId = BigInt(i);
    try {
      const dropInfoArray = (await publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "getDropInfo",
        args: [dropId],
      })) as readonly [
        `0x${string}`,
        `0x${string}`,
        bigint,
        bigint,
        `0x${string}`,
        number,
        readonly bigint[],
        bigint,
        bigint,
        boolean,
        boolean,
        boolean,
        boolean,
        boolean,
        number,
        bigint,
        readonly `0x${string}`[]
      ];

      const [
        _host,
        _sponsor,
        rawEntryFee,
        rawRewardAmountFromDrop,
        rewardToken,
        rewardTypeNum,
        rewardTokenIdsBigInt,
        _maxParticipants,
        currentParticipantsFromDrop,
        _isActive,
        isCompleted,
        isPaidEntryFromDrop,
        _isManualSelection,
        _isSponsored,
        numWinnersFromDrop,
        _fundingDeadline,
        winnerAddressesFromDrop,
      ] = dropInfoArray;

      const currentRewardType = rewardTypeNum as RewardType;

      if (
        isCompleted &&
        winnerAddressesFromDrop &&
        winnerAddressesFromDrop.length > 0 &&
        winnerAddressesFromDrop.length === numWinnersFromDrop
      ) {
        let distributableAmount: bigint;
        if (isPaidEntryFromDrop) {
          distributableAmount = rawEntryFee * currentParticipantsFromDrop;
        } else {
          // Host-funded or Sponsored (already funded)
          distributableAmount = rawRewardAmountFromDrop;
        }

        const calculatedPlatformFee =
          (distributableAmount * platformFeePercent) / 10000n;
        const totalPrizePool = distributableAmount - calculatedPlatformFee;

        const prizeAmountsPerWinner: bigint[] = new Array(
          numWinnersFromDrop
        ).fill(0n);

        if (currentRewardType !== RewardType.NFT) {
          if (numWinnersFromDrop === 1) {
            prizeAmountsPerWinner[0] = totalPrizePool;
          } else if (numWinnersFromDrop === 2) {
            prizeAmountsPerWinner[0] = (totalPrizePool * 60n) / 100n;
            prizeAmountsPerWinner[1] =
              totalPrizePool - prizeAmountsPerWinner[0]; // Remainder to ensure full distribution
          } else if (numWinnersFromDrop === 3) {
            prizeAmountsPerWinner[0] = (totalPrizePool * 50n) / 100n;
            prizeAmountsPerWinner[1] = (totalPrizePool * 30n) / 100n;
            prizeAmountsPerWinner[2] =
              totalPrizePool -
              prizeAmountsPerWinner[0] -
              prizeAmountsPerWinner[1]; // Remainder
          }
        }
        // For NFTs, prizeAmountsPerWinner remains array of 0n, we use rewardTokenIdsBigInt

        for (let j = 0; j < numWinnersFromDrop; j++) {
          const winnerAddress = getAddress(winnerAddressesFromDrop[j]);

          if (!leaderboardMap[winnerAddress]) {
            leaderboardMap[winnerAddress] = { wins: 0, prizes: [] };
          }
          leaderboardMap[winnerAddress].wins += 1;

          let prizeDetail: PrizeDetail | null = null;

          if (currentRewardType === RewardType.ETH) {
            const prizeAmount = prizeAmountsPerWinner[j];
            prizeDetail = {
              type: RewardType.ETH,
              rawValue: prizeAmount,
              amountFormatted: `${formatEther(prizeAmount)} ETH`,
              tokenSymbol: "ETH",
            };
          } else if (
            currentRewardType === RewardType.USDC ||
            currentRewardType === RewardType.ERC20
          ) {
            const prizeAmount = prizeAmountsPerWinner[j];
            const tokenInfo = await getTokenInfo(rewardToken);
            prizeDetail = {
              type: currentRewardType,
              rawValue: prizeAmount,
              amountFormatted: `${formatUnits(
                prizeAmount,
                tokenInfo.decimals
              )} ${tokenInfo.symbol}`,
              tokenAddress: rewardToken,
              tokenSymbol: tokenInfo.symbol,
            };
          } else if (currentRewardType === RewardType.NFT) {
            const nftTokenId = rewardTokenIdsBigInt[j]?.toString();
            if (nftTokenId) {
              const tokenInfo = await getTokenInfo(rewardToken);
              prizeDetail = {
                type: RewardType.NFT,
                amountFormatted: `1 NFT (#${nftTokenId})`,
                tokenAddress: rewardToken,
                tokenSymbol: tokenInfo.symbol,
                tokenId: nftTokenId,
              };
            }
          }

          if (prizeDetail) {
            const existingPrizeIndex = leaderboardMap[
              winnerAddress
            ].prizes.findIndex(
              (p) =>
                p.type === prizeDetail!.type &&
                p.tokenAddress === prizeDetail!.tokenAddress &&
                p.type !== RewardType.NFT
            );

            if (
              prizeDetail.type !== RewardType.NFT &&
              existingPrizeIndex > -1 &&
              prizeDetail.rawValue !== undefined
            ) {
              const existingPrize =
                leaderboardMap[winnerAddress].prizes[existingPrizeIndex];
              existingPrize.rawValue =
                (existingPrize.rawValue || 0n) + prizeDetail.rawValue;
              const tokenInfo = await getTokenInfo(
                existingPrize.tokenAddress ||
                  "0x0000000000000000000000000000000000000000"
              );
              existingPrize.amountFormatted = `${formatUnits(
                existingPrize.rawValue,
                tokenInfo.decimals
              )} ${tokenInfo.symbol}`;
            } else {
              leaderboardMap[winnerAddress].prizes.push(prizeDetail);
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error processing dropId ${i} for leaderboard:`, e);
    }
  }

  const leaderboard: LeaderboardEntry[] = Object.entries(leaderboardMap).map(
    ([address, data]) => {
      const prizeSummary =
        data.prizes.map((p) => p.amountFormatted).join(", ") ||
        "No prizes recorded";
      return { address, wins: data.wins, prizesWon: data.prizes, prizeSummary };
    }
  );

  return leaderboard
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.prizesWon.length !== a.prizesWon.length)
        return b.prizesWon.length - a.prizesWon.length;
      const aEth =
        a.prizesWon.find((p) => p.type === RewardType.ETH)?.rawValue || 0n;
      const bEth =
        b.prizesWon.find((p) => p.type === RewardType.ETH)?.rawValue || 0n;
      if (bEth !== aEth) return bEth > aEth ? 1 : -1;
      return 0;
    })
    .slice(0, 10);
}
