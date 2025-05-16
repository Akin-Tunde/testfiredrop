import React from "react";
import Leaderboard from "../components/Leaderboard";

const LeaderboardPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4 sm:p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-extrabold mb-2">
            <span className="text-red-600">Fireball</span>{" "}
            <span className="text-orange-500">Drop</span>{" "}
            <span className="text-white">Leaderboard</span>
          </h1>
          <div className="h-0.5 sm:h-1 w-20 sm:w-40 bg-gradient-to-r from-red-600 to-orange-500 rounded-full mx-auto mb-2 sm:mb-3"></div>
          <p className="text-sm sm:text-base text-gray-100 text-center">
            Top players ranked by wins and total prizes!
          </p>
        </div>
        <Leaderboard />
      </div>
    </div>
  );
};

export default LeaderboardPage;
