// src/components/DropList.tsx
import React from "react";
import { Link } from "react-router-dom";
import { DropInfo, RewardType, FarcasterUserProfile } from "../types/global"; // Import FarcasterUserProfile
import { getAddress } from "viem"; // For normalizing addresses

interface DropListProps {
  drops: DropInfo[];
  farcasterProfiles?: Record<string, FarcasterUserProfile | undefined>; // Profiles are optional
}

const DropList: React.FC<DropListProps> = ({
  drops,
  farcasterProfiles = {},
}) => {
  return (
    <div>
      {drops.length === 0 ? (
        <p className="text-center text-gray-400 text-lg py-8">
          No drops available.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drops.map((drop) => {
            // Safely get host profile, normalize address for lookup
            const normalizedHostAddress = drop.host
              ? getAddress(drop.host)
              : "";
            const hostProfile = normalizedHostAddress
              ? farcasterProfiles[normalizedHostAddress]
              : undefined;

            let hostDisplay: React.ReactNode = `${drop.host.slice(
              0,
              6
            )}...${drop.host.slice(-4)}`; // Default to truncated address
            if (hostProfile) {
              hostDisplay = (
                <>
                  {hostProfile.pfpUrl && (
                    <img
                      src={hostProfile.pfpUrl}
                      alt={
                        hostProfile.displayName ||
                        hostProfile.username ||
                        drop.host
                      }
                      className="inline-block w-5 h-5 rounded-full mr-1.5 align-middle"
                      onError={(e) => (e.currentTarget.style.display = "none")} // Hide if PFP fails to load
                    />
                  )}
                  {hostProfile.displayName ||
                    hostProfile.username ||
                    hostDisplay}
                </>
              );
            }

            let sponsorDisplay: React.ReactNode | null = null;
            if (
              drop.isSponsored &&
              drop.sponsor &&
              drop.sponsor !== "0x0000000000000000000000000000000000000000"
            ) {
              const normalizedSponsorAddress = getAddress(drop.sponsor);
              const sponsorProfile =
                farcasterProfiles[normalizedSponsorAddress];
              sponsorDisplay =
                sponsorProfile?.displayName ||
                sponsorProfile?.username ||
                `${drop.sponsor.slice(0, 6)}...${drop.sponsor.slice(-4)}`;
              if (sponsorProfile?.pfpUrl) {
                sponsorDisplay = (
                  <>
                    <img
                      src={sponsorProfile.pfpUrl}
                      alt={
                        sponsorProfile.displayName ||
                        sponsorProfile.username ||
                        ""
                      }
                      className="inline-block w-4 h-4 rounded-full mr-1 align-middle"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    {sponsorDisplay}
                  </>
                );
              }
            }

            return (
              <div
                key={drop.id}
                className="bg-gray-900 p-4 rounded-2xl shadow-lg border border-purple-800 hover:shadow-xl transition-shadow duration-200 flex flex-col justify-between"
              >
                <div>
                  {" "}
                  {/* Content wrapper */}
                  <div className="flex items-center justify-between mb-2">
                    <h3
                      className="text-xl font-semibold text-white truncate"
                      title={`Drop #${drop.id}`}
                    >
                      Drop #{drop.id}
                    </h3>
                    {drop.isSponsored && (
                      <span className="bg-yellow-600 text-white text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap">
                        Sponsored
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-gray-200 text-sm">
                    <p className="truncate" title={drop.host}>
                      <span className="font-medium text-gray-400">Host:</span>{" "}
                      {hostDisplay}
                    </p>
                    {sponsorDisplay && (
                      <p className="truncate" title={drop.sponsor}>
                        <span className="font-medium text-gray-400">
                          Sponsor:
                        </span>{" "}
                        {sponsorDisplay}
                      </p>
                    )}
                    <p>
                      <span className="font-medium text-gray-400">Entry:</span>{" "}
                      {drop.entryFee}
                    </p>
                    <p>
                      <span className="font-medium text-gray-400">Reward:</span>{" "}
                      <span className="font-bold text-orange-400">
                        {drop.rewardAmount}
                      </span>
                    </p>
                    {(drop.rewardType === RewardType.ERC20 ||
                      drop.rewardType === RewardType.USDC ||
                      drop.rewardType === RewardType.NFT) &&
                      drop.rewardToken !==
                        "0x0000000000000000000000000000000000000000" && (
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
                    <p>
                      <span className="font-medium text-gray-400">
                        Participants:
                      </span>{" "}
                      {drop.currentParticipants}/{drop.maxParticipants}
                    </p>
                    <p>
                      <span className="font-medium text-gray-400">Status:</span>{" "}
                      {drop.isCompleted ? (
                        <span className="text-red-400">Ended</span>
                      ) : drop.isActive ? (
                        <span className="text-green-400">Active</span>
                      ) : (
                        <span className="text-gray-500">Inactive</span>
                      )}
                    </p>
                    {drop.isSponsored &&
                      drop.fundingDeadline > 0 &&
                      !drop.isCompleted && (
                        <p>
                          <span className="font-medium text-gray-400">
                            Funds By:
                          </span>{" "}
                          {new Date(
                            drop.fundingDeadline * 1000
                          ).toLocaleDateString()}
                        </p>
                      )}
                  </div>
                </div>
                <Link
                  to={`/drop/${drop.id}`}
                  className="block mt-4 text-center text-blue-400 hover:text-blue-300 font-medium text-base py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors duration-200"
                >
                  View Details
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DropList;
