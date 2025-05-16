import React, { useState, useEffect } from "react";
import { formatEther } from "viem";
import { toast } from "react-toastify";
import DropList from "../components/DropList";
import { getContractConfig } from "../utils/contract";
import { DropInfo, RewardType } from "../types/global";

const UpcomingDropsPage: React.FC = () => {
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
          abi,
        } = await getContractConfig();
        const dropCount = (await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "dropCounter",
        })) as bigint;

        const dropList: DropInfo[] = [];
        for (let i = 0; i < Number(dropCount); i++) {
          const dropInfo = (await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi,
            functionName: "getDropInfo",
            args: [BigInt(i)],
          })) as any;

          if (!dropInfo[5] && !dropInfo[6]) {
            dropList.push({
              id: i,
              host: dropInfo[0],
              entryFee: formatEther(dropInfo[1]),
              rewardAmount: formatEther(dropInfo[2]),
              maxParticipants: Number(dropInfo[3]),
              currentParticipants: Number(dropInfo[4]),
              isActive: dropInfo[5],
              isCompleted: dropInfo[6],
              isPaidEntry: dropInfo[7],
              isManualSelection: dropInfo[8],
              numWinners: Number(dropInfo[9]),
              winners: dropInfo[10],
              isSponsored: false,
              fundingDeadline: 0,
              sponsor: "",
              rewardToken: "",
              rewardType: RewardType.ETH,
              rewardTokenIds: [],
            });
          }
        }
        setDrops(dropList);
      } catch (err: any) {
        setError(err.message || "Failed to fetch upcoming drops");
        toast.error(err.message || "Failed to fetch upcoming drops");
        console.error("Error fetching upcoming drops:", err);
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
    <div className="min-h-screen bg-purple-900 p-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-2">
            <span className="text-orange-500">Upcoming</span>{" "}
            <span className="text-pink-500">Drops</span>
          </h1>
          <div className="h-1 w-40 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full mx-auto mb-3"></div>
          <p className="text-gray-300">Stay tuned for these future drops</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
          </div>
        ) : error ? (
          <div className="bg-gray-900 bg-opacity-90 p-8 rounded-2xl shadow-2xl border border-purple-800 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-500 mb-4">
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
            <h2 className="text-xl font-bold text-red-500 mb-2">
              Error Loading Drops
            </h2>
            <p className="text-gray-300">{error}</p>
          </div>
        ) : drops.length === 0 ? (
          <div className="bg-gray-900 bg-opacity-90 p-8 rounded-2xl shadow-2xl border border-purple-800 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-500 mb-4">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              No Upcoming Drops
            </h2>
            <p className="text-gray-300">
              There are no drops scheduled for the future
            </p>
            <button
              onClick={() => (window.location.href = "/create")}
              className="mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-lg"
            >
              Create New Drop
            </button>
          </div>
        ) : (
          <div className="bg-gray-900 bg-opacity-90 p-8 rounded-2xl shadow-2xl border border-purple-800">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-500 mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Coming Soon</h2>
            </div>
            <DropList drops={currentDrops} />
            <div className="mt-6 flex justify-between items-center text-white">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingDropsPage;
