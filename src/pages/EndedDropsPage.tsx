// src/pages/EndedDropsPage.tsx
import React, { useState, useEffect } from "react";
import { formatEther, formatUnits } from "viem";
import { toast } from "react-toastify";
import DropList from "../components/DropList";
import { getContractConfig } from "../utils/contract";
import { DropInfo, RewardType } from "../types/global";
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

const EndedDropsPage: React.FC = () => {
  const [drops, setDrops] = useState<DropInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 7;

  useEffect(() => {
    const fetchDrops = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          publicClient,
          address: contractAddress,
          abi, // This ABI is from the updated contract
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

              // Filter for completed drops
              // For sponsored drops, also ensure they were funded
              if (
                isCompleted &&
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
                  sponsor,
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
        setError(err.message || "Failed to fetch ended drops");
        toast.error(err.message || "Failed to fetch ended drops");
        console.error("Error fetching ended drops:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrops();
  }, []);

  const totalPages = Math.ceil(drops.length / itemsPerPage);
  const indexOfLastDrop = currentPage * itemsPerPage;
  const indexOfFirstDrop = indexOfLastDrop - itemsPerPage;
  const currentDrops = drops.slice(indexOfFirstDrop, indexOfLastDrop);

  const nextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-2">
            <span className="text-red-600">Ended</span>{" "}
            <span className="text-orange-500">Drops</span>
          </h1>
          <div className="h-1 w-40 bg-gradient-to-r from-red-600 to-orange-500 rounded-full mx-auto mb-3"></div>
          <p className="text-gray-100">View all completed Fireball Drops</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : error ? (
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
              Error Loading Drops
            </h2>
            <p className="text-gray-100">{error}</p>
          </div>
        ) : drops.length === 0 ? (
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
              No Ended Drops
            </h2>
            <p className="text-gray-100">
              There are currently no completed drops to view
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
                  {currentDrops.length} of {drops.length})
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
      </div>
    </div>
  );
};

export default EndedDropsPage;
