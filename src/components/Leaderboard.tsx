// src/components/Leaderboard.tsx
import React, { useEffect, useState } from "react";
import { LeaderboardEntry } from "../types/global"; // Ensure FarcasterUserProfile is imported
import { getLeaderboard } from "../utils/contract";
import { useFarcasterProfiles } from "../hooks/useFarcasterProfiles"; // Import the hook
import { getAddress } from "viem"; // For address normalization

const Leaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // For initial leaderboard data fetch
  const [error, setError] = useState<string | null>(null);

  const { profiles: fcProfiles, getProfilesByAddresses } =
    useFarcasterProfiles();

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getLeaderboard();
        setLeaders(data);
        if (data.length > 0) {
          const addressesToFetch = data.map((leader) => leader.address);
          // Non-blocking call to fetch profiles, UI will update when profiles are ready
          getProfilesByAddresses(addressesToFetch);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch leaderboard");
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboardData();
  }, [getProfilesByAddresses]); // getProfilesByAddresses is stable

  if (loading) {
    return (
      <div className="min-h-[300px] flex justify-center items-center">
        {" "}
        {/* Adjusted height for component context */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-orange-300 font-medium">
            Loading leaderboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[300px] flex justify-center items-center">
        {" "}
        {/* Adjusted height */}
        <div className="w-full max-w-md mx-auto">
          {" "}
          {/* Centered error message */}
          <div className="bg-gradient-to-br from-red-700 via-orange-600 to-yellow-500 p-6 rounded-xl shadow-xl border border-orange-600 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800 text-red-400 mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
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
            <h2 className="text-lg font-bold text-white mb-1">
              Error Loading Leaderboard
            </h2>
            <p className="text-gray-200 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    // Assuming parent LeaderboardPage.tsx handles overall page structure (min-h-screen, bg, etc.)
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gray-900 bg-opacity-80 p-4 sm:p-6 rounded-2xl shadow-2xl border border-orange-600 backdrop-blur-sm">
        {/* Title is in LeaderboardPage.tsx, so it's removed here */}
        <div className="bg-gray-800 bg-opacity-60 rounded-lg p-3 sm:p-4">
          <div className="flex justify-between text-xs text-orange-400 uppercase font-semibold mb-4 px-2 tracking-wider">
            <span>Rank & Player</span>
            <span>Prizes Won</span>
          </div>

          {leaders.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm">No players on the leaderboard yet.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {leaders.map((leader, index) => {
                const normalizedAddress = getAddress(leader.address);
                const profile = fcProfiles[normalizedAddress];
                const displayName =
                  profile?.displayName ||
                  profile?.username ||
                  `${leader.address.slice(0, 6)}...${leader.address.slice(-4)}`;
                const pfp = profile?.pfpUrl;

                return (
                  <li
                    key={leader.address}
                    className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-lg transition-all duration-300 hover:bg-orange-800 hover:bg-opacity-25 
                        ${
                          index < 3
                            ? "bg-orange-900 bg-opacity-15 border-l-4 border-orange-500"
                            : "bg-gray-800 bg-opacity-40"
                        }`}
                  >
                    <div className="flex items-center space-x-3 mb-2 sm:mb-0 min-w-0">
                      {" "}
                      {/* Added min-w-0 for truncation */}
                      <span
                        className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm
                            ${
                              index === 0
                                ? "bg-yellow-400 text-gray-900"
                                : index === 1
                                ? "bg-gray-300 text-gray-900"
                                : index === 2
                                ? "bg-yellow-600 text-white"
                                : "bg-gray-700 text-gray-300"
                            }`}
                      >
                        {index + 1}
                      </span>
                      <div className="flex items-center space-x-2 min-w-0">
                        {" "}
                        {/* Added min-w-0 */}
                        {pfp && (
                          <img
                            src={pfp}
                            alt={displayName}
                            className="w-7 h-7 rounded-full flex-shrink-0"
                            onError={(e) =>
                              (e.currentTarget.style.display = "none")
                            }
                          />
                        )}
                        <span
                          className="text-sm sm:text-base font-medium text-gray-200 truncate"
                          title={leader.address}
                        >
                          {displayName}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-3 w-full sm:w-auto pl-10 sm:pl-0">
                      {" "}
                      {/* Indent prize details on small screens */}
                      <div className="flex items-center mb-1 sm:mb-0 text-xs sm:text-sm">
                        <span className="text-orange-400 mr-1.5">Wins:</span>
                        <span className="text-white font-semibold">
                          {leader.wins}
                        </span>
                      </div>
                      <div className="flex flex-col items-start sm:items-end text-xs sm:text-sm">
                        {leader.prizesWon && leader.prizesWon.length > 0 ? (
                          leader.prizesWon.map((prize, prizeIndex) => (
                            <div
                              key={prizeIndex}
                              className="text-gray-300 whitespace-nowrap"
                            >
                              <span className="font-medium text-orange-400">
                                {prize.tokenSymbol || prize.type}:
                              </span>{" "}
                              {prize.amountFormatted}
                              {prize.tokenId && (
                                <span className="text-xs text-gray-500 ml-1">
                                  (ID: {prize.tokenId})
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">No prizes</span>
                        )}
                        {/* Or use prizeSummary for a compact view: */}
                        {/* {leader.prizeSummary && <span className="text-gray-300">{leader.prizeSummary}</span>} */}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
