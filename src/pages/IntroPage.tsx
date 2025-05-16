// src/pages/IntroPage.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { formatEther, formatUnits, getAddress, isAddress } from "viem";
import { toast } from "react-toastify";
import { getContractConfig } from "../utils/contract";
import { sdk } from "@farcaster/frame-sdk";
import { DropInfo, RewardType } from "../types/global"; // Added FarcasterUserProfile
import { ERC20_MINIMAL_ABI } from "../utils/erc20";
import { useFarcasterProfiles } from "../hooks/useFarcasterProfiles"; // Import the hook

// Helper function to get token decimals
async function getTokenDecimals(tokenAddress: `0x${string}`): Promise<number> {
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    return 18;
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

// Intermediate type for raw data from contract before full formatting
interface RawDropData {
  id: number;
  host: `0x${string}`;
  sponsor: `0x${string}`;
  rawEntryFee: bigint;
  rawRewardAmount: bigint;
  rewardToken: `0x${string}`;
  rewardType: RewardType;
  rewardTokenIds: bigint[]; // Stored as bigint from contract
  maxParticipants: number;
  currentParticipants: number;
  isActive: boolean;
  isCompleted: boolean;
  isPaidEntry: boolean;
  isManualSelection: boolean;
  isSponsored: boolean;
  numWinners: number;
  fundingDeadline: number;
  winners: `0x${string}`[]; // Stored as `0x${string}` from contract
}

const IntroPage: React.FC = () => {
  const p5InstanceRef = useRef<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [gameOfTheDay, setGameOfTheDay] = useState<DropInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [popUp, setPopUp] = useState<{
    message: string;
    x: number;
    y: number;
    alpha: number;
  } | null>(null);

  const {
    profiles: fcProfiles,
    getProfilesByAddresses,
    isLoadingProfiles,
  } = useFarcasterProfiles();

  useEffect(() => {
    const fetchUserContext = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        if (isMiniApp) {
          const context = await sdk.context;
          if (context && context.user) {
            const user = context.user;
            const nameToDisplay = user.displayName || user.username;
            if (nameToDisplay) {
              setWelcomeName(nameToDisplay);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching Farcaster user context:", error);
      }
    };
    fetchUserContext();
  }, []);

  const fetchDropsAndSetGameOfTheDay = useCallback(async () => {
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

      const activeDropsWithRawInfo: RawDropData[] = [];

      for (let i = 0; i < Number(dropCount); i++) {
        const dropDetailsArray = (await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi,
          functionName: "getDropInfo",
          args: [BigInt(i)],
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
          sponsor,
          rawEntryFee,
          rawRewardAmount,
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

        if (
          isActive &&
          !isCompleted &&
          (!isSponsored ||
            (isSponsored &&
              sponsor !== "0x0000000000000000000000000000000000000000"))
        ) {
          // Store raw values for sorting, format later for display
          activeDropsWithRawInfo.push({
            id: i,
            host,
            sponsor, // `0x${string}`
            rawEntryFee, // bigint
            rawRewardAmount,
            rewardToken,
            rewardType: rewardTypeNum as RewardType,
            rewardTokenIds: Array.from(rewardTokenIdsBigInt), // Convert readonly bigint[] to bigint[]
            maxParticipants: Number(maxParticipants),
            currentParticipants: Number(currentParticipants),
            isActive,
            isCompleted,
            isPaidEntry,
            isManualSelection,
            isSponsored,
            numWinners,
            fundingDeadline: Number(fundingDeadline),
            winners: Array.from(winners),
          });
        }
      }

      if (activeDropsWithRawInfo.length > 0) {
        activeDropsWithRawInfo.sort((a, b) => {
          if (
            a.rewardType === RewardType.ETH &&
            b.rewardType !== RewardType.ETH
          )
            return -1;
          if (
            a.rewardType !== RewardType.ETH &&
            b.rewardType === RewardType.ETH
          )
            return 1;
          return b.rawRewardAmount > a.rawRewardAmount
            ? 1
            : b.rawRewardAmount < a.rawRewardAmount
            ? -1
            : 0;
        });

        const topGameRaw = activeDropsWithRawInfo[0];

        // Fetch Farcaster profile for the host of the top game
        if (isAddress(topGameRaw.host)) {
          await getProfilesByAddresses([getAddress(topGameRaw.host)]);
        }

        const formattedEntryFee = await formatEntryFeeDisplay(
          topGameRaw.rawEntryFee,
          topGameRaw.isPaidEntry,
          topGameRaw.rewardType,
          topGameRaw.rewardToken
        );
        const formattedRewardAmount = await formatRewardDisplay(
          topGameRaw.rawRewardAmount,
          topGameRaw.rewardType,
          topGameRaw.rewardToken,
          topGameRaw.numWinners,
          topGameRaw.rewardTokenIds.map((id) => id.toString())
        );

        setGameOfTheDay({
          ...topGameRaw,
          entryFee: formattedEntryFee,
          rewardAmount: formattedRewardAmount,
          rewardTokenIds: topGameRaw.rewardTokenIds.map((id) => id.toString()), // Ensure string array for DropInfo type
        });
      } else {
        setGameOfTheDay(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch drops for Game of the Day");
      toast.error(err.message || "Failed to fetch drops");
      console.error("Error fetching drops for Game of the Day:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getProfilesByAddresses]); // getProfilesByAddresses is stable

  useEffect(() => {
    fetchDropsAndSetGameOfTheDay();
  }, [fetchDropsAndSetGameOfTheDay]);

  // p5.js useEffect
  useEffect(() => {
    // ... (p5.js logic remains the same as your provided code)
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.2/p5.min.js";
    script.async = true;
    script.onload = () => {
      const p5 = (window as any).p5;
      const sketchFactory = (p: any) => {
        let canvasWidth: number;
        let canvasHeight: number;
        const baseCanvasWidth = 600;
        const baseCanvasHeight = 400;
        let scaleFactor = 1;

        let pegs: { x: number; y: number }[] = [];
        let balls: {
          landed: boolean;
          x: number;
          y: number;
          vx: number;
          vy: number;
          particles: { x: number; y: number; alpha: number }[];
        }[] = [];
        let slots: { x: number; width: number; label: string }[] = [];
        let confetti: {
          x: number;
          y: number;
          vx: number;
          vy: number;
          alpha: number;
        }[] = [];

        const slotLabels = [
          "0.1 ETH",
          "0.2 ETH",
          "1 ETH",
          "0.5 ETH",
          "0.2 ETH",
          "0.1 ETH",
        ];

        const setupElements = () => {
          pegs = [];
          slots = [];
          const sketchRows = 10;
          const maxCols = 6;
          const spacingX = 50 * scaleFactor;
          const spacingY = 40 * scaleFactor;
          const slotCount = slotLabels.length;
          const slotWidth = canvasWidth / slotCount;
          let currentCols = 1;
          let increasing = true;
          for (let i = 0; i < sketchRows; i++) {
            for (let j = 0; j < currentCols; j++) {
              const x =
                (canvasWidth - (currentCols - 1) * spacingX) / 2 + j * spacingX;
              const y = i * spacingY + spacingY + 10 * scaleFactor;
              pegs.push({ x, y });
            }
            if (increasing) {
              currentCols++;
              if (currentCols > maxCols) increasing = false;
            } else {
              currentCols--;
            }
          }
          for (let i = 0; i < slotCount; i++) {
            slots.push({
              x: i * slotWidth,
              width: slotWidth,
              label: slotLabels[i],
            });
          }
        };

        const calculateDimensionsAndSetup = () => {
          if (canvasRef.current) {
            canvasWidth = canvasRef.current.offsetWidth;
            canvasHeight =
              canvasWidth > 0
                ? canvasWidth * (baseCanvasHeight / baseCanvasWidth)
                : baseCanvasHeight * scaleFactor;
            scaleFactor = canvasWidth > 0 ? canvasWidth / baseCanvasWidth : 1;
            setupElements();
          }
        };

        p.setup = () => {
          calculateDimensionsAndSetup();
          if (canvasWidth > 0 && canvasHeight > 0)
            p.createCanvas(canvasWidth, canvasHeight);
          else console.warn("Canvas dimensions zero in setup.");
        };
        p.windowResized = () => {
          calculateDimensionsAndSetup();
          if (canvasWidth > 0 && canvasHeight > 0)
            p.resizeCanvas(canvasWidth, canvasHeight);
        };
        p.draw = () => {
          if (!canvasWidth || !canvasHeight) return;
          p.background(20, 20, 20);
          const pegDrawRadius = 5 * scaleFactor;
          p.fill(255, 165, 0);
          p.noStroke();
          for (let peg of pegs) p.circle(peg.x, peg.y, pegDrawRadius * 2);
          const slotDrawHeight = 30 * scaleFactor;
          for (let slot of slots) {
            p.fill(50, 50, 50);
            p.rect(
              slot.x,
              canvasHeight - slotDrawHeight,
              slot.width,
              slotDrawHeight
            );
            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(Math.max(8, 12 * scaleFactor));
            p.text(
              slot.label,
              slot.x + slot.width / 2,
              canvasHeight - slotDrawHeight / 2
            );
          }
          for (let ball of balls) {
            /* ... ball physics and rendering ... */
            for (let particle of ball.particles) {
              p.fill(
                255,
                p.lerp(255, 165, particle.alpha),
                0,
                particle.alpha * 255
              );
              p.circle(particle.x, particle.y, 4 * scaleFactor);
              particle.alpha -= 0.02;
            }
            ball.particles = ball.particles.filter((pr) => pr.alpha > 0);
            const ballDrawRadius = 8 * scaleFactor;
            p.fill(255, 69, 0);
            p.circle(ball.x, ball.y, ballDrawRadius * 2);
            ball.y += ball.vy;
            ball.vy += 0.1;
            ball.x += ball.vx;
            if (ball.vy > 0)
              ball.particles.push({ x: ball.x, y: ball.y, alpha: 1 });
            const ballCollisionRadius = 8 * scaleFactor;
            const pegCollisionRadius = 5 * scaleFactor;
            for (let peg of pegs) {
              const dx = ball.x - peg.x;
              const dy = ball.y - peg.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < ballCollisionRadius + pegCollisionRadius) {
                const angle = Math.atan2(dy, dx);
                ball.vx = -ball.vx * 0.7 + Math.cos(angle) * 0.5;
                ball.vy = -ball.vy * 0.7 + Math.sin(angle) * 0.5;
              }
            }
            const slotCollisionHeight = 30 * scaleFactor;
            if (
              ball.y >
              canvasHeight - slotCollisionHeight - ballCollisionRadius
            ) {
              ball.y = canvasHeight - slotCollisionHeight - ballCollisionRadius;
              ball.vy = 0;
              ball.vx *= 0.9;
              if (Math.abs(ball.vx) < 0.1 && !ball.landed) {
                ball.vx = 0;
                const currentSlotWidth = canvasWidth / slotLabels.length;
                const slotIndex = Math.floor(ball.x / currentSlotWidth);
                if (slotIndex >= 0 && slotIndex < slots.length) {
                  ball.x = slots[slotIndex].x + slots[slotIndex].width / 2;
                  ball.landed = true;
                  setPopUp({
                    message: `You Landed on ${slots[slotIndex].label}!`,
                    x: ball.x,
                    y: canvasHeight / 2,
                    alpha: 1,
                  });
                  for (let k = 0; k < 20; k++)
                    confetti.push({
                      x: ball.x,
                      y: canvasHeight - slotCollisionHeight,
                      vx: (Math.random() - 0.5) * 4,
                      vy: -Math.random() * 5,
                      alpha: 1,
                    });
                }
              }
            }
            if (ball.x < ballCollisionRadius) {
              ball.x = ballCollisionRadius;
              ball.vx = -ball.vx * 0.7;
            }
            if (ball.x > canvasWidth - ballCollisionRadius) {
              ball.x = canvasWidth - ballCollisionRadius;
              ball.vx = -ball.vx * 0.7;
            }
          }
          for (let c of confetti) {
            /* ... confetti rendering ... */
            p.fill(255, p.lerp(165, 69, c.alpha), 0, c.alpha * 255);
            p.circle(c.x, c.y, 5 * scaleFactor);
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.1;
            c.alpha -= 0.02;
          }
          confetti = confetti.filter((c) => c.alpha > 0);
          balls = balls.filter(
            (ball) => ball.y < canvasHeight + 8 * scaleFactor * 2
          );
        };
        p.dropBall = () => {
          balls.push({
            x: canvasWidth / 2 + (Math.random() - 0.5) * (50 * scaleFactor),
            y: 0,
            vx: (Math.random() - 0.5) * 2,
            vy: 0,
            particles: [],
            landed: false,
          });
        };
      };
      if (canvasRef.current) {
        canvasRef.current.innerHTML = "";
        p5InstanceRef.current = new p5(sketchFactory, canvasRef.current);
      }
    };
    document.body.appendChild(script);
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
      if (script.parentNode === document.body)
        document.body.removeChild(script);
    };
  }, []);

  const handleDropBall = () => {
    if (p5InstanceRef.current && p5InstanceRef.current.dropBall) {
      p5InstanceRef.current.dropBall();
    }
  };

  const hostProfile =
    gameOfTheDay?.host && isAddress(gameOfTheDay.host)
      ? fcProfiles[getAddress(gameOfTheDay.host)]
      : undefined;
  const hostDisplayName =
    hostProfile?.displayName ||
    hostProfile?.username ||
    (gameOfTheDay?.host
      ? `${gameOfTheDay.host.slice(0, 6)}...${gameOfTheDay.host.slice(-4)}`
      : "N/A");

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-900 p-4 md:p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2">
            <span className="text-red-600">Fireball</span>{" "}
            <span className="text-orange-500">Drop</span>
          </h1>
          <div className="h-1 w-40 bg-gradient-to-r from-red-600 to-orange-500 rounded-full mx-auto mb-3"></div>
          {welcomeName && (
            <p className="text-lg md:text-xl text-orange-400 mb-2">
              Welcome, {welcomeName}!
            </p>
          )}
          <p className="text-gray-300 text-sm md:text-base">
            Create giveaways and compete for big ETH prizes!
          </p>
        </div>

        {/* Game of the Day Section */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">
            🔥 Game of the Day 🔥
          </h2>
          {loading || (isLoadingProfiles && !gameOfTheDay) ? ( // Show loading if initial drops or profile for GotD is loading
            <div className="flex justify-center items-center py-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
              <p className="ml-3 text-orange-300">Loading Game of the Day...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 text-sm md:text-base bg-gray-800 p-4 rounded-lg">
              {error}
            </div>
          ) : gameOfTheDay ? (
            <div className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 p-6 rounded-xl shadow-2xl border border-orange-700">
              <div className="text-center mb-3">
                {hostProfile?.pfpUrl && (
                  <img
                    src={hostProfile.pfpUrl}
                    alt={hostDisplayName}
                    className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-white shadow-md"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
                <p className="text-sm text-gray-200">
                  Hosted by:{" "}
                  <span className="font-semibold text-white">
                    {hostDisplayName}
                  </span>
                </p>
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 text-center">
                Prize: {gameOfTheDay.rewardAmount}
                {gameOfTheDay.isSponsored && (
                  <span className="text-xs sm:text-sm ml-2 bg-yellow-600 text-white px-2 py-1 rounded-full whitespace-nowrap">
                    Sponsored
                  </span>
                )}
              </h3>
              <p className="text-gray-100 text-sm md:text-base text-center">
                Entry Fee: {gameOfTheDay.entryFee}
              </p>
              <p className="text-gray-100 text-sm md:text-base text-center">
                Participants: {gameOfTheDay.currentParticipants}/
                {gameOfTheDay.maxParticipants}
              </p>
              <p className="text-gray-100 text-sm md:text-base text-center">
                Winners: {gameOfTheDay.numWinners}
              </p>
              <div className="flex justify-center mt-4">
                <Link
                  to={gameOfTheDay ? `/drop/${gameOfTheDay.id}` : "/available"}
                  className="py-2 px-4 md:px-6 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg text-sm md:text-base"
                >
                  Join Now
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-300 text-sm md:text-base bg-gray-800 p-4 rounded-lg">
              No active drops available for Game of the Day.
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Link
            to="/create"
            className="py-2 px-4 md:px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg text-sm md:text-base"
          >
            Create Game
          </Link>
          <Link
            to="/sponsor"
            className="py-2 px-4 md:px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg text-sm md:text-base"
          >
            Sponsor Game
          </Link>
          <Link
            to="/available"
            className="py-2 px-4 md:px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg text-sm md:text-base"
          >
            Available
          </Link>
          <Link
            to="/leaderboard"
            className="py-2 px-4 md:px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg text-sm md:text-base"
          >
            Leaderboard
          </Link>
        </div>

        {/* Plinko Board Section */}
        <div className="bg-gray-800 p-3 sm:p-4 md:p-8 rounded-2xl shadow-2xl border border-orange-700 mb-8">
          <div className="mx-auto w-full sm:max-w-md">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
              Try the Plinko Board
            </h2>
            <div className="relative mb-6">
              <div
                ref={canvasRef}
                className="w-full h-auto aspect-[600/400] rounded bg-gray-900"
              ></div>
              {popUp && (
                <div
                  className="absolute left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold py-2 px-4 md:py-3 md:px-5 rounded-lg shadow-lg animate-pulse text-xs md:text-sm"
                  style={{
                    top: `${popUp.y}px`,
                    opacity: popUp.alpha,
                    zIndex: 10,
                  }}
                >
                  {popUp.message}
                </div>
              )}
            </div>
            <button
              onClick={handleDropBall}
              className="w-full py-2 px-4 md:py-3 md:px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg text-sm md:text-base"
            >
              Drop Fireball!
            </button>
            <p className="text-gray-300 text-center mt-4 text-sm md:text-base">
              Watch the fireball bounce to see how it works! Join drops to win
              real rewards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroPage;
