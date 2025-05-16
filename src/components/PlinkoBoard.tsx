import { useState, useEffect, useRef, forwardRef } from "react";

interface ParticipantSlotsProps {
  maxParticipants: number;
  currentParticipants: number;
  selectedWinners: { slot: number; rank: number }[];
}

const ParticipantSlots: React.FC<ParticipantSlotsProps> = ({
  maxParticipants,
  currentParticipants,
  selectedWinners,
}) => {
  const slotContainerRef = useRef<HTMLDivElement>(null);
  const [slotWidth, setSlotWidth] = useState<number>(40); // Default width in pixels

  useEffect(() => {
    const resizeSlots = () => {
      if (slotContainerRef.current) {
        const containerWidth = slotContainerRef.current.offsetWidth;
        // Calculate slot width to fit all slots within container
        // Include 2px margin (1px each side) per slot
        const maxSlotWidth = 40; // Maximum slot width
        const minSlotWidth = 20; // Minimum slot width for readability
        const totalMargin = maxParticipants * 2; // 1px margin on each side
        let calculatedWidth = (containerWidth - totalMargin) / maxParticipants;
        calculatedWidth = Math.min(
          maxSlotWidth,
          Math.max(minSlotWidth, calculatedWidth)
        );
        setSlotWidth(calculatedWidth);
      }
    };

    resizeSlots();
    window.addEventListener("resize", resizeSlots);
    return () => window.removeEventListener("resize", resizeSlots);
  }, [maxParticipants]);

  return (
    <div ref={slotContainerRef} className="flex w-full overflow-hidden">
      {Array.from({ length: maxParticipants }).map((_, index) => {
        const isParticipant = index < currentParticipants;
        const winner = selectedWinners.find((w) => w.slot === index);
        return (
          <div
            key={index}
            className={`flex-shrink-0 mx-0.5 text-center text-xs font-medium border rounded
              ${
                winner
                  ? winner.rank === 1
                    ? "bg-yellow-500 text-gray-900 border-yellow-600"
                    : winner.rank === 2
                    ? "bg-gray-300 text-gray-900 border-gray-400"
                    : winner.rank === 3
                    ? "bg-amber-700 text-white border-amber-800"
                    : "bg-green-500 text-white border-green-600"
                  : isParticipant
                  ? "bg-gray-600 text-gray-200 border-gray-700"
                  : "bg-gray-800 text-gray-400 border-gray-900"
              }`}
            style={{
              width: `${slotWidth}px`,
              height: "30px",
              lineHeight: "30px",
            }}
          >
            {winner
              ? `${winner.rank}${
                  winner.rank === 1
                    ? "st"
                    : winner.rank === 2
                    ? "nd"
                    : winner.rank === 3
                    ? "rd"
                    : "th"
                }`
              : index + 1}
          </div>
        );
      })}
    </div>
  );
};

interface PlinkoBoardProps {
  dropId: string;
  rows: number;
  numWinners: number;
  currentParticipants: number;
  maxParticipants: number;
  dropBall: () => Promise<number[]>;
  isHost: boolean;
  isManual: boolean;
  isActive: boolean;
  isCompleted: boolean;
  winnerIndices: number[];
  animateWinners: boolean;
  setAnimateWinners: (value: boolean) => void;
}

const PlinkoBoard = forwardRef<
  { dropBall: () => Promise<number[]> },
  PlinkoBoardProps
>(
  ({
    dropId,
    rows,
    numWinners,
    currentParticipants,
    maxParticipants,
    dropBall,
    isHost,
    isManual,
    isActive,
    isCompleted,
    winnerIndices = [], // Default to empty array
    animateWinners,
    setAnimateWinners,
  }) => {
    const [isDropping, setIsDropping] = useState<boolean>(false);
    const [animatedWinners, setAnimatedWinners] = useState<
      { slot: number; rank: number }[]
    >([]);
    const [currentAnimatingWinnerIndex, setCurrentAnimatingWinnerIndex] =
      useState<number>(-1);
    const [popUp, setPopUp] = useState<{
      message: string;
      alpha: number;
    } | null>(null);

    const [p5Ready, setP5Ready] = useState<boolean>(false);
    const p5InstanceRef = useRef<any>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [actualWinnerIndexes, setActualWinnerIndexes] = useState<number[]>(
      []
    );
    const isInitialized = useRef<boolean>(false);
    const prevDropIdRef = useRef<string | undefined>();

    const handleDrop = async () => {
      if (isDropping || !isHost || !isManual || !isActive || isCompleted)
        return;
      if (!p5InstanceRef.current || !p5Ready) {
        console.warn("PlinkoBoard: p5 instance not ready for manual drop.");
        return;
      }
      setIsDropping(true);
      setAnimatedWinners([]);
      setActualWinnerIndexes([]);
      setCurrentAnimatingWinnerIndex(-1);
      setPopUp(null);

      try {
        const winnerIndexesFromResult = await dropBall();
        console.log("Manual winners:", winnerIndexesFromResult);
        setActualWinnerIndexes(winnerIndexesFromResult.slice(0, numWinners));
        setCurrentAnimatingWinnerIndex(0);
      } catch (error) {
        console.error("Error dropping ball:", error);
        setIsDropping(false);
        if (p5InstanceRef.current && p5Ready) {
          p5InstanceRef.current.noLoop();
        }
      }
    };

    useEffect(() => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.2/p5.min.js";
      script.async = true;
      script.onload = () => {
        if (!canvasRef.current || isInitialized.current) {
          if (p5InstanceRef.current) setP5Ready(true);
          return;
        }

        const p5 = (window as any).p5;
        const sketchFactory = (p: any) => {
          let canvasWidth: number;
          let canvasHeight: number;
          const baseCanvasWidth = 500;
          const baseCanvasHeight = maxParticipants > 20 ? 500 : 400;
          let scaleFactor = 1;
          let pegs: { x: number; y: number }[] = [];
          let currentBallObj: {
            x: number;
            y: number;
            vx: number;
            vy: number;
            targetSlot: number;
            onLanded: () => void;
            landed: boolean;
            particles: { x: number; y: number; alpha: number }[];
          } | null = null;

          const setupElements = () => {
            pegs = [];
            const spacingX = Math.min(
              40 * scaleFactor,
              canvasWidth / (rows + 1)
            );
            const spacingY = Math.min(
              30 * scaleFactor,
              canvasHeight / (rows + 5)
            );

            for (let r = 0; r < rows; r++) {
              const numPegsInRow = r + 2;
              const totalWidthForRow = (numPegsInRow - 1) * spacingX;
              const startX = (canvasWidth - totalWidthForRow) / 2;
              for (let c = 0; c < numPegsInRow; c++) {
                pegs.push({
                  x: startX + c * spacingX,
                  y: (r + 1) * spacingY + 30 * scaleFactor,
                });
              }
            }
          };

          const calculateDimensionsAndSetup = () => {
            if (canvasRef.current) {
              canvasWidth = canvasRef.current.offsetWidth;
              canvasHeight = canvasRef.current.offsetHeight;
              scaleFactor = Math.min(
                canvasWidth / baseCanvasWidth,
                canvasHeight / baseCanvasHeight
              );
              setupElements();
            }
          };

          p.setup = () => {
            calculateDimensionsAndSetup();
            p.createCanvas(canvasWidth, canvasHeight);
            p.noLoop();
          };

          p.windowResized = () => {
            calculateDimensionsAndSetup();
            p.resizeCanvas(canvasWidth, canvasHeight);
            p.redraw();
          };

          p.draw = () => {
            p.background(26, 28, 42);

            p.fill(150, 150, 150);
            p.noStroke();
            const pegDrawRadius = 4 * scaleFactor;
            for (let peg of pegs) {
              p.circle(peg.x, peg.y, pegDrawRadius * 2);
            }

            const slotWidth = canvasWidth / maxParticipants;
            const slotHeight = 30 * scaleFactor;
            for (let i = 0; i < maxParticipants; i++) {
              p.fill(50, 50, 50);
              p.rect(
                i * slotWidth,
                canvasHeight - slotHeight,
                slotWidth,
                slotHeight - 1
              );
              p.fill(200);
              p.textAlign(p.CENTER, p.CENTER);
              p.textSize(Math.max(6, 10 * scaleFactor));
              p.text(
                i + 1,
                i * slotWidth + slotWidth / 2,
                canvasHeight - slotHeight / 2
              );
            }

            if (currentBallObj && !currentBallObj.landed) {
              const ball = currentBallObj;
              const ballDrawRadius = 7 * scaleFactor;
              for (let particle of ball.particles) {
                p.fill(
                  255,
                  p.lerp(255, 165, particle.alpha),
                  0,
                  particle.alpha * 255
                );
                p.circle(particle.x, particle.y, 3 * scaleFactor);
                particle.alpha -= 0.03;
              }
              ball.particles = ball.particles.filter((pr) => pr.alpha > 0);
              if (ball.vy > 0.1) {
                ball.particles.push({
                  x: ball.x,
                  y: ball.y - ballDrawRadius,
                  alpha: 1,
                });
              }

              p.fill(255, 100, 0);
              p.circle(ball.x, ball.y, ballDrawRadius * 2);

              ball.y += ball.vy;
              ball.vy += 0.25 * scaleFactor;
              ball.x += ball.vx;

              for (let peg of pegs) {
                const dx = ball.x - peg.x;
                const dy = ball.y - peg.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < ballDrawRadius + pegDrawRadius) {
                  const angle = Math.atan2(dy, dx);
                  const hitSpeed = 0.8;
                  ball.vx =
                    Math.cos(angle) * hitSpeed + (p.random() - 0.5) * 0.5;
                  ball.vy = Math.sin(angle) * hitSpeed * 0.8 - p.random() * 1.5;
                  if (ball.y > canvasHeight * 0.7) {
                    const targetX = (ball.targetSlot + 0.5) * slotWidth;
                    ball.vx += (targetX - ball.x) * 0.005 * scaleFactor;
                  }
                }
              }

              if (
                ball.x < ballDrawRadius ||
                ball.x > canvasWidth - ballDrawRadius
              ) {
                ball.vx *= -0.7;
                ball.x = p.constrain(
                  ball.x,
                  ballDrawRadius,
                  canvasWidth - ballDrawRadius
                );
              }

              if (ball.y > canvasHeight - slotHeight - ballDrawRadius) {
                const targetX = (ball.targetSlot + 0.5) * slotWidth;
                ball.x += (targetX - ball.x) * 0.3;
                ball.vy *= 0.5;

                if (
                  Math.abs(ball.x - targetX) < slotWidth * 0.2 &&
                  Math.abs(ball.vy) < 0.5 * scaleFactor
                ) {
                  ball.landed = true;
                  ball.x = targetX;
                  ball.y = canvasHeight - slotHeight / 2 - ballDrawRadius / 2;
                  ball.vx = 0;
                  ball.vy = 0;
                  setAnimatedWinners((prev) => [
                    ...prev,
                    {
                      slot: ball.targetSlot,
                      rank: currentAnimatingWinnerIndex + 1,
                    },
                  ]);
                  ball.onLanded();
                }
              }
            }
          };

          p.animateBallToTarget = (
            targetSlotIdx: number,
            onComplete: () => void
          ) => {
            currentBallObj = {
              x: canvasWidth / 2 + (p.random() - 0.5) * (20 * scaleFactor),
              y: 10 * scaleFactor,
              vx: (p.random() - 0.5) * 1,
              vy: 0,
              targetSlot: targetSlotIdx,
              onLanded: onComplete,
              landed: false,
              particles: [],
            };
            console.log(
              "[p5 sketch] animateBallToTarget called for slot:",
              targetSlotIdx
            );
            p.loop();
          };
        };

        canvasRef.current!.innerHTML = "";
        p5InstanceRef.current = new p5(sketchFactory, canvasRef.current);
        isInitialized.current = true;
        console.log(
          "p5.js initialized for drop with rows:",
          rows,
          "maxParticipants:",
          maxParticipants
        );
        setP5Ready(true);
      };
      document.body.appendChild(script);

      return () => {
        setP5Ready(false);
        if (p5InstanceRef.current) {
          p5InstanceRef.current.remove();
          p5InstanceRef.current = null;
          isInitialized.current = false;
          console.log("p5.js instance cleaned up");
        }
        if (script.parentNode === document.body) {
          document.body.removeChild(script);
        }
      };
    }, [maxParticipants, rows]);

    useEffect(() => {
      if (prevDropIdRef.current && prevDropIdRef.current !== dropId) {
        console.log(
          `PlinkoBoard: Drop ID changed from ${prevDropIdRef.current} to ${dropId}. Resetting animation state.`
        );
        setIsDropping(false);
        setAnimatedWinners([]);
        setActualWinnerIndexes([]);
        setCurrentAnimatingWinnerIndex(-1);
        setPopUp(null);
        if (p5InstanceRef.current && p5Ready) {
          p5InstanceRef.current.noLoop();
        }
      }
      prevDropIdRef.current = dropId;
    }, [dropId, p5Ready]);

    useEffect(() => {
      if (
        actualWinnerIndexes.length > 0 ||
        currentAnimatingWinnerIndex !== -1
      ) {
        console.log("[PlinkoBoard Animation Sequence Effect]", {
          actualWinnerIndexes: actualWinnerIndexes.slice(),
          currentAnimatingWinnerIndex,
          p5Ready,
          p5InstanceExists: !!p5InstanceRef.current,
        });
      }
      if (
        actualWinnerIndexes.length > 0 &&
        currentAnimatingWinnerIndex >= 0 &&
        currentAnimatingWinnerIndex < actualWinnerIndexes.length
      ) {
        if (
          p5InstanceRef.current &&
          p5InstanceRef.current.animateBallToTarget &&
          p5Ready
        ) {
          const targetSlot = actualWinnerIndexes[currentAnimatingWinnerIndex];
          console.log(
            "PlinkoBoard: Attempting to animate winner at slot:",
            targetSlot
          );
          p5InstanceRef.current.animateBallToTarget(targetSlot, () => {
            console.log(
              "PlinkoBoard: Ball landed for slot",
              targetSlot,
              "Incrementing currentAnimatingWinnerIndex."
            );
            setCurrentAnimatingWinnerIndex((prev) => prev + 1);
          });
        } else {
          console.warn(
            "PlinkoBoard: Animation Sequence - Conditions not met to call animateBallToTarget",
            {
              p5InstanceExists: !!p5InstanceRef.current,
              animateBallToTargetExists:
                !!p5InstanceRef.current?.animateBallToTarget,
              p5Ready,
            }
          );
        }
      } else if (
        actualWinnerIndexes.length > 0 &&
        currentAnimatingWinnerIndex >= actualWinnerIndexes.length
      ) {
        setIsDropping(false);
        if (p5InstanceRef.current && p5Ready) {
          p5InstanceRef.current.noLoop();
        }
        setPopUp({
          message: `Winner${
            actualWinnerIndexes.length > 1 ? "s" : ""
          }: ${actualWinnerIndexes
            .map((slot: number, index: number) => {
              const rank = index + 1;
              let suffix = "th";
              if (rank === 1) suffix = "st";
              else if (rank === 2) suffix = "nd";
              else if (rank === 3) suffix = "rd";
              return `#${slot + 1} (${rank}${suffix})`;
            })
            .join(", ")}!`,
          alpha: 1,
        });
        const fadeOutTimer = setTimeout(() => {
          let currentAlpha = 1;
          const interval = setInterval(() => {
            currentAlpha -= 0.05;
            if (currentAlpha <= 0) {
              clearInterval(interval);
              setPopUp(null);
            } else {
              setPopUp((prev: { message: string; alpha: number } | null) =>
                prev ? { ...prev, alpha: currentAlpha } : null
              );
            }
          }, 50);
        }, 2000);
        return () => clearTimeout(fadeOutTimer);
      }
    }, [
      actualWinnerIndexes,
      currentAnimatingWinnerIndex,
      numWinners,
      p5Ready,
      setIsDropping,
      setPopUp,
    ]);

    useEffect(() => {
      console.log("[PlinkoBoard Auto Animation Trigger Effect]", {
        animateWinners,
        winnerIndices: winnerIndices.slice(),
        isDropping,
        p5Ready,
        p5InstanceExists: !!p5InstanceRef.current,
        numWinners,
      });
      if (
        animateWinners &&
        winnerIndices.length > 0 &&
        !isDropping &&
        p5InstanceRef.current &&
        p5Ready
      ) {
        console.log(
          "Automatic winners triggered - setting state:",
          winnerIndices.slice()
        );
        setIsDropping(true);
        setAnimatedWinners([]);
        setActualWinnerIndexes(winnerIndices.slice(0, numWinners));
        setCurrentAnimatingWinnerIndex(0);
        setAnimateWinners(false);
      }
    }, [
      animateWinners,
      winnerIndices,
      numWinners,
      isDropping,
      p5Ready,
      setAnimateWinners,
    ]);

    return (
      <div className="relative bg-gray-800 rounded-2xl p-4 shadow-2xl border border-orange-500 h-[calc(100vh-300px)] max-h-[600px] min-h-[400px] flex flex-col">
        {isHost && isManual && isActive && !isCompleted && (
          <button
            onClick={handleDrop}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg w-full max-w-xs sm:max-w-sm md:max-w-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isDropping || !isManual || !p5Ready}
          >
            Drop Ball
          </button>
        )}
        <div
          ref={canvasRef}
          className="flex-grow w-full mt-12 rounded bg-gray-900"
        ></div>
        <div className="mt-4">
          <ParticipantSlots
            maxParticipants={maxParticipants}
            currentParticipants={currentParticipants}
            selectedWinners={animatedWinners}
          />
          {popUp && (
            <div
              className="absolute left-1/2 transform -translate-x-1/2 top-1/2 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg animate-pulse"
              style={{ opacity: popUp.alpha }}
            >
              {popUp.message}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default PlinkoBoard;
