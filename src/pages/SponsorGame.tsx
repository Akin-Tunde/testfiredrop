// src/pages/SponsorGame.tsx
import React, { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { formatEther, formatUnits, getAddress, isAddress } from "viem";
import { toast } from "react-toastify";
import { getContractConfig } from "../utils/contract";
import { RewardType } from "../types/global"; // Added FarcasterUserProfile
import { ERC20_MINIMAL_ABI, ERC721_MINIMAL_ABI } from "../utils/erc20";
import { useFarcasterProfiles } from "../hooks/useFarcasterProfiles"; // Import the hook

interface SponsoredDropToFund {
  dropId: bigint;
  rawRewardAmount: bigint;
  rewardAmountDisplay: string;
  rewardToken: `0x${string}`;
  rewardType: RewardType;
  rewardTokenIds: string[];
  maxParticipants: bigint;
  numWinners: number;
  fundingDeadline: bigint;
  host: `0x${string}`;
}

async function getTokenDecimals(tokenAddress: `0x${string}`): Promise<number> {
  if (tokenAddress === "0x0000000000000000000000000000000000000000") return 18;
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
      `Could not fetch decimals for ${tokenAddress}, defaulting to 18.`
    );
    return 18;
  }
}

async function formatRewardDisplay(
  rawAmount: bigint,
  rewardType: RewardType,
  rewardTokenAddress: `0x${string}`,
  numWinners: number,
  rewardTokenIdsForDisplay: string[]
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
      rewardTokenIdsForDisplay.length > 0
        ? rewardTokenIdsForDisplay.length
        : numWinners;
    return `${count} NFT(s)`;
  }
  return "N/A";
}

const SponsorGame: React.FC = () => {
  const { address, isConnected, isConnecting } = useAccount();
  const { data: walletClient, isLoading: isWalletClientLoading } =
    useWalletClient();
  const [dropsToFund, setDropsToFund] = useState<SponsoredDropToFund[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // For initial drop fetch
  const [fundingInProgress, setFundingInProgress] = useState<bigint | null>(
    null
  );

  const {
    profiles: fcProfiles,
    getProfilesByAddresses,
    isLoadingProfiles,
  } = useFarcasterProfiles();

  useEffect(() => {
    const fetchUnfundedDrops = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const {
          publicClient,
          address: contractAddress,
          abi,
        } = getContractConfig();

        const unfundedDropIds: bigint[] = (await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "getUnfundedSponsoredDrops",
        })) as bigint[];

        const hostAddressesToFetch = new Set<string>();
        const dropDetailsPromises = unfundedDropIds.map(async (dropId) => {
          const detailsArray = (await publicClient.readContract({
            address: contractAddress as `0x${string}`,
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
            host,
            sponsorAddress,
            _entryFee,
            rawRewardAmount,
            rewardToken,
            rewardTypeNum,
            rewardTokenIdsBigInt,
            maxParticipants,
            _currentParticipants,
            isActive,
            _isCompleted,
            _isPaidEntry,
            _isManualSelection,
            isActuallySponsored,
            numWinners,
            fundingDeadline,
            _winners,
          ] = detailsArray;

          if (
            isActuallySponsored &&
            sponsorAddress === "0x0000000000000000000000000000000000000000" &&
            isActive
          ) {
            if (isAddress(host)) hostAddressesToFetch.add(getAddress(host)); // Collect host address

            const currentRewardType = rewardTypeNum as RewardType;
            const tokenIdsStr = rewardTokenIdsBigInt.map((id) => id.toString());
            const displayAmount = await formatRewardDisplay(
              rawRewardAmount,
              currentRewardType,
              rewardToken,
              numWinners,
              tokenIdsStr
            );

            return {
              dropId,
              host,
              rawRewardAmount,
              rewardAmountDisplay: displayAmount,
              rewardToken,
              rewardType: currentRewardType,
              rewardTokenIds: tokenIdsStr,
              maxParticipants,
              numWinners,
              fundingDeadline,
            };
          }
          return null;
        });

        const resolvedDropDetails = (
          await Promise.all(dropDetailsPromises)
        ).filter((drop): drop is SponsoredDropToFund => drop !== null);

        setDropsToFund(resolvedDropDetails);

        // Fetch Farcaster profiles for all collected host addresses
        if (hostAddressesToFetch.size > 0) {
          await getProfilesByAddresses(Array.from(hostAddressesToFetch));
        }
      } catch (error: any) {
        const msg =
          "Error fetching unfunded drops. The contract might be unavailable or an issue occurred.";
        setErrorMessage(msg);
        toast.error(msg);
        console.error("Error fetching unfunded drops:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUnfundedDrops();
  }, [getProfilesByAddresses]); // getProfilesByAddresses is stable

  const handleFundDrop = async (dropToFund: SponsoredDropToFund) => {
    if (isConnecting || isWalletClientLoading || !walletClient || !address) {
      toast.error("Please connect your wallet to fund a drop.");
      setErrorMessage("Wallet not connected or not ready.");
      return;
    }
    if (
      isAddress(dropToFund.host) &&
      getAddress(address) === getAddress(dropToFund.host)
    ) {
      toast.error("As the host, you cannot also be the sponsor for this drop.");
      return;
    }

    setFundingInProgress(dropToFund.dropId);
    setErrorMessage(null);

    try {
      const {
        publicClient,
        address: contractAddress,
        abi,
      } = getContractConfig();
      let valueToSend: bigint = 0n;

      if (
        dropToFund.rewardType === RewardType.USDC ||
        dropToFund.rewardType === RewardType.ERC20
      ) {
        const amountToApprove = dropToFund.rawRewardAmount;
        toast.info(
          `Requesting approval to spend ${dropToFund.rewardAmountDisplay}...`
        );
        const approveTx = await walletClient.writeContract({
          address: dropToFund.rewardToken,
          abi: ERC20_MINIMAL_ABI,
          functionName: "approve",
          args: [contractAddress, amountToApprove],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
        toast.success("Token approval successful! Proceeding to fund...");
      } else if (dropToFund.rewardType === RewardType.NFT) {
        for (const tokenIdStr of dropToFund.rewardTokenIds) {
          const tokenId = BigInt(tokenIdStr);
          toast.info(`Requesting approval for NFT ID: ${tokenIdStr}...`);
          const approveNftHash = await walletClient.writeContract({
            address: dropToFund.rewardToken,
            abi: ERC721_MINIMAL_ABI,
            functionName: "approve",
            args: [contractAddress, tokenId],
          });
          await publicClient.waitForTransactionReceipt({
            hash: approveNftHash,
          });
          toast.success(`NFT ID: ${tokenIdStr} approved!`);
        }
        toast.success("All NFT approvals successful! Proceeding to fund...");
      } else if (dropToFund.rewardType === RewardType.ETH) {
        valueToSend = dropToFund.rawRewardAmount;
      }

      const fundTxHash = await walletClient.writeContract({
        address: contractAddress,
        abi,
        functionName: "fundSponsoredGame",
        args: [dropToFund.dropId],
        value: valueToSend,
      });

      await publicClient.waitForTransactionReceipt({ hash: fundTxHash });
      toast.success(`Drop #${dropToFund.dropId} funded successfully!`);

      setDropsToFund((prevDrops) =>
        prevDrops.filter((d) => d.dropId !== dropToFund.dropId)
      );
    } catch (error: any) {
      const message =
        error.shortMessage ||
        error.message?.split("(")[0] ||
        "Error funding drop.";
      setErrorMessage(message);
      toast.error(message);
      console.error("Error funding drop:", error);
    } finally {
      setFundingInProgress(null);
    }
  };

  const formatDeadline = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4 md:p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">
            <span className="text-red-600">Sponsor</span>{" "}
            <span className="text-orange-500">a Drop</span>
          </h1>
          <div className="h-1 w-40 bg-gradient-to-r from-red-600 to-orange-500 rounded-full mx-auto mb-3"></div>
          <p className="text-gray-100 text-center text-sm md:text-base">
            Support creators by funding their sponsored drops!
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-800 via-orange-700 to-yellow-600 p-6 md:p-8 rounded-2xl shadow-2xl border border-orange-500">
          <div className="mx-auto max-w-md">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
              Drops Awaiting Sponsorship
            </h2>

            {loading || (isLoadingProfiles && dropsToFund.length === 0) ? (
              <div className="flex justify-center items-center py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-100"></div>
                <p className="ml-3 text-gray-200">
                  Loading drops & profiles...
                </p>
              </div>
            ) : errorMessage && !dropsToFund.length ? (
              <div
                className="mt-4 text-center text-red-300 bg-red-900 bg-opacity-50 p-3 rounded-md text-sm"
                role="alert"
              >
                {errorMessage}
              </div>
            ) : dropsToFund.length === 0 ? (
              <p className="text-gray-200 text-center">
                No unfunded sponsored drops available right now. Check back
                later!
              </p>
            ) : (
              <div className="space-y-4">
                {dropsToFund.map((drop) => {
                  const hostProfile = isAddress(drop.host)
                    ? fcProfiles[getAddress(drop.host)]
                    : undefined;
                  const hostDisplay =
                    hostProfile?.displayName ||
                    hostProfile?.username ||
                    `${drop.host.slice(0, 6)}...${drop.host.slice(-4)}`;

                  return (
                    <div
                      key={drop.dropId.toString()}
                      className="bg-gray-800 p-4 rounded-lg border border-orange-600 shadow-md"
                    >
                      <p className="text-gray-100 text-sm">
                        <span className="font-semibold text-gray-300">
                          Drop ID:
                        </span>{" "}
                        {drop.dropId.toString()}
                      </p>
                      <p
                        className="text-gray-100 text-sm truncate flex items-center"
                        title={drop.host}
                      >
                        <span className="font-semibold text-gray-300 mr-1.5">
                          Created By:
                        </span>
                        {hostProfile?.pfpUrl && (
                          <img
                            src={hostProfile.pfpUrl}
                            alt={hostDisplay}
                            className="w-4 h-4 rounded-full mr-1.5"
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                          />
                        )}
                        {hostDisplay}
                      </p>
                      <p className="text-gray-100 text-sm">
                        <span className="font-semibold text-gray-300">
                          Reward:
                        </span>{" "}
                        <span className="font-bold text-orange-400">
                          {drop.rewardAmountDisplay}
                        </span>
                      </p>
                      {(drop.rewardType === RewardType.ERC20 ||
                        drop.rewardType === RewardType.USDC ||
                        drop.rewardType === RewardType.NFT) && (
                        <p
                          className="text-xs text-gray-400 truncate"
                          title={drop.rewardToken}
                        >
                          <span className="font-medium">Token:</span>{" "}
                          {drop.rewardToken.slice(0, 8)}...
                          {drop.rewardToken.slice(-4)}
                        </p>
                      )}
                      {drop.rewardType === RewardType.NFT &&
                        drop.rewardTokenIds.length > 0 && (
                          <p
                            className="text-xs text-gray-400 truncate"
                            title={drop.rewardTokenIds.join(", ")}
                          >
                            <span className="font-medium">NFT IDs:</span>{" "}
                            {drop.rewardTokenIds.join(", ").substring(0, 20)}
                            {drop.rewardTokenIds.join(", ").length > 20
                              ? "..."
                              : ""}
                          </p>
                        )}
                      <p className="text-gray-100 text-xs">
                        <span className="font-semibold text-gray-300">
                          Max Participants:
                        </span>{" "}
                        {drop.maxParticipants.toString()}
                      </p>
                      <p className="text-gray-100 text-xs">
                        <span className="font-semibold text-gray-300">
                          Winners:
                        </span>{" "}
                        {drop.numWinners}
                      </p>
                      <p className="text-gray-100 text-xs">
                        <span className="font-semibold text-gray-300">
                          Funding Deadline:
                        </span>{" "}
                        {formatDeadline(drop.fundingDeadline)}
                      </p>
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => handleFundDrop(drop)}
                          disabled={
                            fundingInProgress === drop.dropId ||
                            !isConnected ||
                            (address &&
                              isAddress(drop.host) &&
                              getAddress(address) === getAddress(drop.host))
                          }
                          className="py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                          aria-label={`Fund Drop ${drop.dropId}`}
                        >
                          {fundingInProgress === drop.dropId
                            ? "Funding..."
                            : "Fund This Drop"}
                        </button>
                      </div>
                      {address &&
                        isAddress(drop.host) &&
                        getAddress(address) === getAddress(drop.host) && (
                          <p className="text-xs text-yellow-400 text-center mt-2">
                            You cannot sponsor your own drop.
                          </p>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
            {errorMessage && dropsToFund.length > 0 && (
              <div
                className="mt-4 text-center text-red-300 bg-red-900 bg-opacity-50 p-3 rounded-md text-sm"
                role="alert"
              >
                {errorMessage}
              </div>
            )}
            <div className="mt-8 pt-4 border-t border-gray-700 text-center text-xs text-gray-300">
              Funded drops will appear in the "Available Drops" section for
              participants to join.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SponsorGame;
