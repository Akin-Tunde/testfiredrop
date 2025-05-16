// src/pages/MyDropsPage.tsx
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { formatEther, formatUnits, getAddress } from "viem";
import { toast } from "react-toastify";
import DropList from "../components/DropList";
import { getContractConfig } from "../utils/contract";
import { sdk } from "@farcaster/frame-sdk";
import { DropInfo, RewardType } from "../types/global"; // Ensure DropInfo includes all new fields
import { ERC20_MINIMAL_ABI } from "../utils/erc20";

// Helper function to get token decimals (can be moved to a shared utility)
async function getTokenDecimals(tokenAddress: `0x${string}`): Promise<number> {
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    return 18; // ETH default
  }
  const { publicClient } = getContractConfig();
  try {
    const decimals = (await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_MINIMAL_ABI,
      functionName: "decimals",
    })) as number;
    return Number(decimals);
  } catch (e) {
    console.warn(
      `Could not fetch decimals for ${tokenAddress}, defaulting to 18. Error: ${e}`
    );
    return 18;
  }
}

// Helper to format reward amount based on type for display
async function formatRewardDisplay(
  rawAmount: bigint,
  rewardType: RewardType,
  rewardTokenAddress: `0x${string}`,
  numWinners: number,
  rewardTokenIds: string[]
): Promise<string> {
  if (rewardType === RewardType.ETH) {
    return `${formatEther(rawAmount)} ETH`;
  } else if (
    rewardType === RewardType.USDC ||
    rewardType === RewardType.ERC20
  ) {
    const decimals = await getTokenDecimals(rewardTokenAddress);
    const { publicClient } = getContractConfig();
    let symbol = "Tokens";
    try {
      symbol = (await publicClient.readContract({
        address: rewardTokenAddress,
        abi: ERC20_MINIMAL_ABI,
        functionName: "symbol",
      })) as string;
    } catch (e) {
      console.warn(
        `Could not fetch symbol for ${rewardTokenAddress}, using default. Error: ${e}`
      );
    }
    return `${formatUnits(rawAmount, decimals)} ${symbol}`;
  } else if (rewardType === RewardType.NFT) {
    const count =
      rewardTokenIds.length > 0 ? rewardTokenIds.length : numWinners;
    return `${count} NFT(s)`;
  }
  return "N/A";
}

// Helper to format entry fee for display
async function formatEntryFeeDisplay(
  rawAmount: bigint,
  isPaidEntry: boolean,
  dropRewardType: RewardType,
  dropRewardTokenAddress: `0x${string}`
): Promise<string> {
  if (!isPaidEntry || rawAmount === 0n) {
    return "Free";
  }
  if (
    dropRewardType === RewardType.USDC ||
    dropRewardType === RewardType.ERC20
  ) {
    const decimals = await getTokenDecimals(dropRewardTokenAddress);
    const { publicClient } = getContractConfig();
    let symbol = "Tokens";
    try {
      symbol = (await publicClient.readContract({
        address: dropRewardTokenAddress,
        abi: ERC20_MINIMAL_ABI,
        functionName: "symbol",
      })) as string;
    } catch (e) {
      console.warn(
        `Could not fetch symbol for entry fee token ${dropRewardTokenAddress}, using default. Error: ${e}`
      );
    }
    return `${formatUnits(rawAmount, decimals)} ${symbol}`;
  } else {
    return `${formatEther(rawAmount)} ETH`;
  }
}

const MyDropsPage: React.FC = () => {
  const { address } = useAccount();
  const [drops, setDrops] = useState<DropInfo[]>([]);
  const [filteredDrops, setFilteredDrops] = useState<DropInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filter, setFilter] = useState<"all" | "created" | "joined">("all");
  const itemsPerPage = 7;
  const [farcasterUser, setFarcasterUser] = useState<{
    name: string | null;
    pfpUrl: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchDrops = async () => {
      if (!address) {
        setLoading(false);
        setDrops([]);
        setFilteredDrops([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const {
          publicClient,
          address: contractAddress,
          abi,
        } = getContractConfig();
        const dropCount = (await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "dropCounter",
        })) as bigint;

        const dropListPromises: Promise<DropInfo | null>[] = [];
        for (let i = 0; i < Number(dropCount); i++) {
          dropListPromises.push(
            (async (): Promise<DropInfo | null> => {
              const dropDetailsArray = (await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi,
                functionName: "getDropInfo",
                args: [BigInt(i)],
              })) as [
                string, // host
                string, // sponsor
                bigint, // entryFee
                bigint, // rewardAmount
                `0x${string}`, // rewardToken
                number, // rewardType (enum as number)
                bigint[], // rewardTokenIds
                bigint, // maxParticipants
                bigint, // currentParticipants
                boolean, // isActive
                boolean, // isCompleted
                boolean, // isPaidEntry
                boolean, // isManualSelection
                boolean, // isSponsored
                number, // numWinners
                bigint, // fundingDeadline
                string[] // winners
              ];

              const [
                host,
                sponsor,
                rawEntryFee,
                rawRewardAmountFromContract,
                rewardToken,
                rewardTypeNum,
                rewardTokenIdsBigInt,
                maxParticipants,
                currentParticipants,
                isActive,
                isCompleted,
                isPaidEntry,
                isManualSelection,
                isSponsored,
                numWinners,
                fundingDeadline,
                winners,
              ] = dropDetailsArray;

              const currentRewardType = rewardTypeNum as RewardType;
              const normalizedUserAddress = getAddress(address); // Normalize current user's address
              const normalizedHostAddress = getAddress(host);

              // Check if user is host OR participant
              let isUserParticipant = false;
              if (normalizedHostAddress !== normalizedUserAddress) {
                // Only fetch participants if not host, to check for participation
                // More efficient: use contract's hasJoinedDrop(dropId, userAddress)
                try {
                  isUserParticipant = (await publicClient.readContract({
                    address: contractAddress as `0x${string}`,
                    abi,
                    functionName: "hasJoinedDrop",
                    args: [BigInt(i), normalizedUserAddress],
                  })) as boolean;
                } catch (e) {
                  console.warn(
                    `Could not check participation for drop ${i} for user ${address}`,
                    e
                  );
                }
              }
              const isUserHost =
                normalizedHostAddress === normalizedUserAddress;

              // Include drops where user is host or participant.
              // Also, only include funded sponsored drops.
              if (
                (isUserHost || isUserParticipant) &&
                (!isSponsored ||
                  (isSponsored &&
                    sponsor !== "0x0000000000000000000000000000000000000000"))
              ) {
                const tokenIdsStr = rewardTokenIdsBigInt.map((id) =>
                  id.toString()
                );
                const formattedEntryFee = await formatEntryFeeDisplay(
                  rawEntryFee,
                  isPaidEntry,
                  currentRewardType,
                  rewardToken
                );
                const formattedRewardAmount = await formatRewardDisplay(
                  rawRewardAmountFromContract,
                  currentRewardType,
                  rewardToken,
                  numWinners,
                  tokenIdsStr
                );

                return {
                  id: i,
                  host,
                  sponsor, // sponsor address from getDropInfo
                  entryFee: formattedEntryFee,
                  rewardAmount: formattedRewardAmount,
                  rewardToken,
                  rewardType: currentRewardType,
                  rewardTokenIds: tokenIdsStr,
                  maxParticipants: Number(maxParticipants),
                  currentParticipants: Number(currentParticipants),
                  isActive,
                  isCompleted,
                  isPaidEntry,
                  isManualSelection,
                  isSponsored,
                  numWinners,
                  fundingDeadline: Number(fundingDeadline),
                  winners,
                };
              }
              return null;
            })()
          );
        }
        const resolvedDrops = (await Promise.all(dropListPromises)).filter(
          (drop): drop is DropInfo => drop !== null
        );
        setDrops(resolvedDrops);
      } catch (err: any) {
        setError(err.message || "Failed to fetch your drops");
        toast.error(err.message || "Failed to fetch your drops");
        console.error("Error fetching your drops:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrops();
  }, [address]);

  useEffect(() => {
    const fetchFarcasterUser = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        if (isMiniApp) {
          const context = await sdk.context;
          if (context && context.user) {
            const user = context.user;
            const nameToDisplay = user.displayName || user.username || "User";
            setFarcasterUser({
              name: nameToDisplay,
              pfpUrl: user.pfpUrl || null,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching Farcaster user for MyDropsPage:", err);
      }
    };
    fetchFarcasterUser();
  }, []);

  // Apply filter based on user selection
  useEffect(() => {
    if (!address) {
      setFilteredDrops([]);
      return;
    }
    let newFilteredDrops = drops;
    if (filter === "created") {
      newFilteredDrops = drops.filter(
        (drop) => getAddress(drop.host) === getAddress(address) // Normalize for comparison
      );
    } else if (filter === "joined") {
      // The `drops` array already contains only drops where user is host OR participant.
      // So, if not host, they must have participated.
      newFilteredDrops = drops.filter(
        (drop) => getAddress(drop.host) !== getAddress(address)
      );
    }
    setFilteredDrops(newFilteredDrops);
    setCurrentPage(1);
  }, [filter, drops, address]);

  // ... (Rest of the JSX for loading, error, and display - remains the same as your provided code)
  // The key changes are in the data fetching and filtering logic above.
  // For brevity, I'm omitting the identical JSX here but it should be included in the final file.
  // Ensure DropList component correctly displays the new DropInfo fields.

  if (loading && address) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!address && !loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex flex-col justify-center items-center text-center">
        <div className="bg-gradient-to-br from-red-800 via-orange-700 to-yellow-600 p-8 rounded-2xl shadow-2xl border border-orange-500">
          <h2 className="text-2xl font-bold text-white mb-4">Connect Wallet</h2>
          <p className="text-gray-200 mb-6">
            Please connect your wallet to view your drops.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-red-800 via-orange-700 to-yellow-600 p-8 rounded-2xl shadow-2xl border border-orange-500 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 text-red-400 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Error Loading My Drops
            </h2>
            <p className="text-gray-100">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredDrops.length / itemsPerPage);
  const indexOfLastDrop = currentPage * itemsPerPage;
  const indexOfFirstDrop = indexOfLastDrop - itemsPerPage;
  const currentDrops = filteredDrops.slice(indexOfFirstDrop, indexOfLastDrop);

  const nextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-10">
          {farcasterUser && (
            <div className="flex flex-col items-center mb-4">
              {farcasterUser.pfpUrl && (
                <img
                  src={farcasterUser.pfpUrl}
                  alt={`${farcasterUser.name || "User"}'s profile picture`}
                  className="w-20 h-20 rounded-full border-2 border-orange-500 shadow-lg mb-2"
                />
              )}
              <h1 className="text-4xl md:text-5xl font-extrabold">
                <span className="text-red-600">
                  {farcasterUser.name || "Your"}'s
                </span>{" "}
                <span className="text-orange-500">Drops</span>
              </h1>
            </div>
          )}
          {!farcasterUser && address && (
            <h1 className="text-5xl font-extrabold mb-2">
              <span className="text-red-600">My</span>{" "}
              <span className="text-orange-500">Drops</span>
            </h1>
          )}
          {address && (
            <>
              <div className="h-1 w-48 bg-gradient-to-r from-red-600 to-orange-500 rounded-full mx-auto mb-3"></div>
              <p className="text-gray-100">
                View drops you host or participate in
              </p>
            </>
          )}
        </div>

        {address && (
          <>
            <div className="mb-6 flex justify-center gap-4">
              <button
                onClick={() => setFilter("all")}
                className={`py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                  filter === "all"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-100 hover:bg-gray-700"
                }`}
              >
                All My Drops
              </button>
              <button
                onClick={() => setFilter("created")}
                className={`py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                  filter === "created"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-100 hover:bg-gray-700"
                }`}
              >
                Created
              </button>
              <button
                onClick={() => setFilter("joined")}
                className={`py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                  filter === "joined"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-100 hover:bg-gray-700"
                }`}
              >
                Joined
              </button>
            </div>

            {filteredDrops.length === 0 && !loading ? (
              <div className="bg-gradient-to-br from-red-800 via-orange-700 to-yellow-600 p-8 rounded-2xl shadow-2xl border border-orange-500 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 text-yellow-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  No Drops Found
                </h2>
                <p className="text-gray-100">
                  {filter === "created"
                    ? "You haven't created any drops yet."
                    : filter === "joined"
                    ? "You haven't joined any drops yet."
                    : "You are not associated with any drops yet."}
                </p>
                <button
                  onClick={() => (window.location.href = "/create")}
                  className="mt-4 py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg"
                >
                  Create New Drop
                </button>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-red-800 via-orange-700 to-yellow-600 p-8 rounded-2xl shadow-2xl border border-orange-500">
                <DropList drops={currentDrops} />
                {totalPages > 1 && (
                  <div className="mt-6 flex justify-between items-center text-white">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span>
                      Page {currentPage} of {totalPages} (Showing{" "}
                      {currentDrops.length} of {filteredDrops.length})
                    </span>
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="py-2 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyDropsPage;
