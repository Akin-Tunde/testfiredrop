import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

type FundingType = "participant" | "host";

interface ControlsPanelProps {
  onCreateDrop: (params: {
    entryFeeInEth: number;
    rewardAmountInEth: number;
    maxParticipants: number;
    isPaidEntry: boolean;
    isManualSelection: boolean;
    numWinners: number;
  }) => Promise<void>;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({ onCreateDrop }) => {
  const [fundingType, setFundingType] = useState<FundingType>("participant");
  const [isManual, setIsManual] = useState(false);
  const [entryFee, setEntryFee] = useState(0.01); // Default to a small entry fee
  const [rewardAmount, setRewardAmount] = useState(0.1); // Default reward for host-funded
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [numWinners, setNumWinners] = useState(1);
  const [isFormValid, setIsFormValid] = useState(false);

  // Effect to update reward amount for participant-funded drops
  useEffect(() => {
    if (fundingType === "participant") {
      // Calculate reward based on entry fee and max participants
      // Using toFixed to handle potential floating point inaccuracies before further processing
      const calculatedReward = parseFloat(
        (entryFee * maxParticipants).toFixed(10)
      );
      setRewardAmount(calculatedReward);
    }
  }, [entryFee, maxParticipants, fundingType]);

  // Effect to reset entry fee for host-funded drops
  useEffect(() => {
    if (fundingType === "host") {
      setEntryFee(0);
    } else {
      // Reset to a default if switching back from host-funded and entry fee was 0
      if (entryFee === 0) setEntryFee(0.01);
    }
  }, [fundingType]);

  const validateForm = useCallback(() => {
    if (fundingType === "participant") {
      if (entryFee <= 0) {
        toast.error(
          "Entry fee must be greater than 0 for participant-funded drops."
        );
        return false;
      }
      const calculatedReward = parseFloat(
        (entryFee * maxParticipants).toFixed(10)
      );
      if (rewardAmount !== calculatedReward) {
        // This should ideally not happen if UI updates correctly, but good for safety
        toast.error(
          "Reward amount must equal Entry Fee * Max Participants for participant-funded drops."
        );
        return false;
      }
    } else {
      // host-funded
      if (entryFee !== 0) {
        toast.error("Entry fee must be 0 for host-funded drops.");
        return false;
      }
      if (rewardAmount <= 0) {
        toast.error(
          "Reward amount must be greater than 0 for host-funded drops."
        );
        return false;
      }
    }

    if (maxParticipants < 1 || maxParticipants > 20) {
      // UI constraint
      toast.error("Max participants must be between 1 and 20.");
      return false;
    }
    if (numWinners < 1 || numWinners > 3) {
      // Contract constraint (MAX_NUM_WORDS)
      toast.error("Number of winners must be between 1 and 3.");
      return false;
    }
    if (numWinners >= maxParticipants) {
      // Contract requires maxParticipants > numWinners
      toast.error(
        "Max participants must be greater than the number of winners."
      );
      return false;
    }
    return true;
  }, [fundingType, entryFee, rewardAmount, maxParticipants, numWinners]);

  useEffect(() => {
    // Basic validation for enabling/disabling button, detailed toast on submit
    let valid = true;
    if (fundingType === "participant") {
      if (entryFee <= 0) valid = false;
    } else {
      // host-funded
      if (rewardAmount <= 0) valid = false;
    }
    if (maxParticipants < 1 || maxParticipants > 20) valid = false;
    if (numWinners < 1 || numWinners > 3) valid = false;
    if (numWinners >= maxParticipants) valid = false;
    setIsFormValid(valid);
  }, [fundingType, entryFee, rewardAmount, maxParticipants, numWinners]);

  const handleCreateDrop = async () => {
    if (!validateForm()) {
      return;
    }

    const isPaidEntry = fundingType === "participant";
    let finalEntryFee = entryFee;
    let finalRewardAmount = rewardAmount;

    if (isPaidEntry) {
      finalRewardAmount = parseFloat((entryFee * maxParticipants).toFixed(10));
    } else {
      // Host-funded
      finalEntryFee = 0;
    }

    await onCreateDrop({
      entryFeeInEth: finalEntryFee,
      rewardAmountInEth: finalRewardAmount,
      maxParticipants,
      isPaidEntry,
      isManualSelection: isManual,
      numWinners,
    });
  };

  return (
    <div className="w-1/4 p-4 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-lg md:text-xl mb-4 text-white font-semibold">
        Controls
      </h2>
      <div className="mb-4">
        <label className="block mb-1 text-white text-sm">Funding Type:</label>
        <div className="flex">
          <label className="mr-2 md:mr-4 text-white flex items-center text-xs md:text-sm">
            <input
              type="radio"
              name="fundingType"
              value="participant"
              checked={fundingType === "participant"}
              onChange={() => setFundingType("participant")}
              className="mr-1 accent-blue-500"
            />
            Participant-Funded
          </label>
          <label className="text-white flex items-center text-xs md:text-sm">
            <input
              type="radio"
              name="fundingType"
              value="host"
              checked={fundingType === "host"}
              onChange={() => setFundingType("host")}
              className="mr-1 accent-blue-500"
            />
            Host-Funded
          </label>
        </div>
      </div>

      <label className="block mb-2 text-white text-sm">
        <input
          type="checkbox"
          checked={isManual}
          onChange={(e) => setIsManual(e.target.checked)}
          className="mr-1 md:mr-2 accent-blue-500"
        />{" "}
        Manual
      </label>
      <input
        type="number"
        value={entryFee}
        onChange={(e) =>
          setEntryFee(Math.max(0, parseFloat(e.target.value) || 0))
        }
        className={`w-full p-1.5 md:p-2 mb-2 bg-gray-700 rounded text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
          fundingType === "host" ? "opacity-50 cursor-not-allowed" : ""
        }`}
        placeholder="Entry Fee (ETH)"
        step="0.01"
        min="0"
        disabled={fundingType === "host"}
        readOnly={fundingType === "host"}
      />
      <input
        type="number"
        value={rewardAmount}
        onChange={(e) =>
          setRewardAmount(Math.max(0, parseFloat(e.target.value) || 0))
        }
        className={`w-full p-1.5 md:p-2 mb-2 bg-gray-700 rounded text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
          fundingType === "participant" ? "opacity-50 cursor-not-allowed" : ""
        }`}
        placeholder="Reward Amount (ETH)"
        step="0.01"
        min="0"
        disabled={fundingType === "participant"}
        readOnly={fundingType === "participant"}
      />
      <input
        type="number"
        value={maxParticipants}
        onChange={(e) =>
          setMaxParticipants(Math.min(20, Math.max(1, Number(e.target.value))))
        }
        className="w-full p-1.5 md:p-2 mb-2 bg-gray-700 rounded text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        placeholder="Max Participants"
        min="1"
        max="20"
      />
      <select
        value={numWinners}
        onChange={(e) =>
          setNumWinners(Math.min(3, Math.max(1, Number(e.target.value))))
        }
        className="w-full p-1.5 md:p-2 mb-2 bg-gray-700 rounded text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      >
        <option value={1}>1 Winner</option>
        <option value={2}>2 Winners</option>
        <option value={3}>3 Winners</option>
      </select>
      <button
        className="w-full bg-blue-500 p-1.5 md:p-2 rounded mt-2 text-white font-medium hover:bg-blue-600 transition duration-200 disabled:bg-gray-500 text-sm md:text-base"
        onClick={handleCreateDrop}
        disabled={!isFormValid}
      >
        Create Drop
      </button>
    </div>
  );
};

export default ControlsPanel;
