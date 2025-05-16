import React from "react";

interface ParticipantSlotsProps {
  maxParticipants: number;
  currentParticipants: number; // Renamed from currentParticipants for clarity
  selectedWinners?: { slot: number; rank: number }[]; // Updated to include rank
}

const ParticipantSlots: React.FC<ParticipantSlotsProps> = ({
  maxParticipants,
  currentParticipants,
  selectedWinners = [],
}) => {
  const slots = [];
  // Base color scheme for non-winning active slots
  const baseColorScheme = [
    "bg-red-600",
    "bg-red-500",
    "bg-orange-500",
    "bg-orange-400",
    "bg-yellow-500",
    "bg-yellow-400",
    "bg-lime-500",
    "bg-green-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  const maxSlots = Math.min(maxParticipants, 30);
  for (let i = 0; i < maxSlots; i++) {
    const isActive = i < currentParticipants;
    const winnerInfo = selectedWinners.find((winner) => winner.slot === i);

    let slotClass = "";
    let rankText = "";

    if (isActive) {
      if (winnerInfo) {
        if (winnerInfo.rank === 1) {
          slotClass = "bg-yellow-400 border-yellow-600 text-black font-bold"; // Gold
          rankText = "1st";
        } else if (winnerInfo.rank === 2) {
          slotClass = "bg-gray-300 border-gray-500 text-black font-bold"; // Silver
          rankText = "2nd";
        } else if (winnerInfo.rank === 3) {
          slotClass = "bg-orange-400 border-orange-600 text-black font-bold"; // Bronze (using orange for better contrast)
          rankText = "3rd";
        } else {
          // Other winners (if numWinners > 3)
          slotClass = "bg-green-500 border-green-700 text-white";
          rankText = `${winnerInfo.rank}th`;
        }
      } else {
        // Active, but not a winner
        const colorIndex = i % baseColorScheme.length;
        slotClass = `${baseColorScheme[colorIndex]} text-white`;
      }
    } else {
      // Inactive slot
      slotClass = "bg-gray-600 opacity-50 text-white";
    }

    slots.push(
      <div
        key={i}
        className={`mx-1 px-1 py-1 text-xs text-center rounded w-10 h-10 flex flex-col items-center justify-center transition-all duration-300 hover:scale-110 border-2 ${slotClass} ${
          isActive ? "shadow-lg" : ""
        }`}
      >
        <span className="block">{i + 1}</span>
        {rankText && (
          <span className="block text-[10px] leading-tight">{rankText}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-center mt-4 overflow-x-auto">
      <div className="flex flex-col">
        <div className="flex mb-2">{slots.slice(0, 15)}</div>
        <div className="flex">{slots.slice(15, 30)}</div>
      </div>
    </div>
  );
};

export default ParticipantSlots;
