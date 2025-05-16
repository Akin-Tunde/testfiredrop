// api/frame/[dropId].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getContractConfig } from "../../../src/utils/contract"; // Adjust path as needed
import { DropInfo, RewardType } from "../../../src/types/global"; // Adjust path
import { ERC20_MINIMAL_ABI } from "../../../src/utils/erc20"; // Adjust path
import { formatEther, formatUnits } from "viem";
import satori from "satori";
import sharp from "sharp";
import React from "react"; // Satori uses React for templating

// Helper to fetch token info (simplified for server-side, consider caching)
async function getTokenInfoServerSide(
  tokenAddress: `0x${string}`
): Promise<{ decimals: number; symbol: string; name: string }> {
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    return { decimals: 18, name: "Ethereum", symbol: "ETH" };
  }
  const { publicClient } = getContractConfig();
  try {
    const [decimals, symbol, name] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_MINIMAL_ABI,
        functionName: "decimals",
      }) as Promise<number>,
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_MINIMAL_ABI,
        functionName: "symbol",
      }) as Promise<string>,
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_MINIMAL_ABI,
        functionName: "name",
      }) as Promise<string>,
    ]);
    return { decimals: Number(decimals), symbol, name };
  } catch (e) {
    console.warn(
      `[Frame API] Could not fetch full info for ${tokenAddress}. Error: ${e}`
    );
    return { decimals: 18, name: "Token", symbol: "TKN" }; // Fallback
  }
}

// Helper to format amounts (simplified for server-side)
async function formatAmountServerSide(
  amount: bigint,
  rewardType: RewardType,
  tokenAddress: `0x${string}`
): Promise<string> {
  if (rewardType === RewardType.ETH) {
    return `${formatEther(amount)} ETH`;
  } else if (
    rewardType === RewardType.USDC ||
    rewardType === RewardType.ERC20
  ) {
    const tokenInfo = await getTokenInfoServerSide(tokenAddress);
    return `${formatUnits(amount, tokenInfo.decimals)} ${tokenInfo.symbol}`;
  }
  // For NFT, amount might be count, or we might display something else
  return `${amount.toString()} units`; // Fallback for NFT or unknown
}

// React component for the frame image (can be more complex)
const FrameImageComponent: React.FC<{
  drop: DropInfo | null;
  error?: string;
}> = ({ drop, error }) => {
  if (error || !drop) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a2e",
          color: "white",
          padding: "20px",
          fontFamily: "Arial, sans-serif",
          border: "2px solid #ff6f61",
          borderRadius: "10px",
        }}
      >
        <h1
          style={{ fontSize: "48px", color: "#ff6f61", marginBottom: "10px" }}
        >
          Fireball Drop
        </h1>
        <p style={{ fontSize: "28px", textAlign: "center" }}>
          {error || "Drop details not available."}
        </p>
        <p style={{ fontSize: "20px", marginTop: "20px" }}>
          Visit Fireball to play!
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: "#1a1a2e",
        color: "white",
        padding: "30px 20px",
        fontFamily: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
        border: "3px solid #ff8c00",
        borderRadius: "12px",
        textAlign: "center",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}
      >
        <img
          src="https://fireball-rho.vercel.app/logo.jpg"
          width="60"
          height="60"
          alt="Fireball Logo"
          style={{
            borderRadius: "50%",
            marginRight: "15px",
            border: "2px solid #ff8c00",
          }}
        />
        <h1
          style={{
            fontSize: "42px",
            color: "#ff8c00",
            margin: 0,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Fireball Drop #{drop.id}
        </h1>
      </div>

      <div
        style={{
          fontSize: "32px",
          color: "#f0f0f0",
          marginBottom: "10px",
          fontWeight: 600,
        }}
      >
        Prize:{" "}
        <span style={{ color: "#ffdd57", fontWeight: 700 }}>
          {drop.rewardAmount}
        </span>
      </div>

      <div style={{ fontSize: "24px", color: "#cccccc", marginBottom: "15px" }}>
        Entry: <span style={{ color: "#a0aec0" }}>{drop.entryFee}</span>
      </div>

      <div style={{ fontSize: "22px", color: "#cccccc" }}>
        {drop.currentParticipants} / {drop.maxParticipants} Participants
      </div>

      {drop.isSponsored && (
        <div
          style={{
            marginTop: "10px",
            padding: "5px 10px",
            backgroundColor: "#ffdd57",
            color: "#333",
            borderRadius: "15px",
            fontSize: "18px",
            fontWeight: 600,
          }}
        >
          Sponsored
        </div>
      )}

      <div style={{ marginTop: "auto", fontSize: "18px", color: "#a0aec0" }}>
        Host: {drop.host.slice(0, 6)}...{drop.host.slice(-4)}
      </div>
    </div>
  );
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { dropId: dropIdQuery } = req.query;
  const dropId = Array.isArray(dropIdQuery) ? dropIdQuery[0] : dropIdQuery;

  console.log(`[Frame API] Request for dropId: ${dropId}`);

  if (!dropId || isNaN(parseInt(dropId))) {
    return res.status(400).send("Invalid or missing dropId");
  }

  const numericDropId = BigInt(dropId);
  let dropDataForImage: DropInfo | null = null;
  let fetchError: string | null = null;

  try {
    const { publicClient, address: contractAddress, abi } = getContractConfig();
    const dropInfoRaw = (await publicClient.readContract({
      address: contractAddress,
      abi,
      functionName: "getDropInfo",
      args: [numericDropId],
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
    ] = dropInfoRaw;

    const currentRewardType = rewardTypeNum as RewardType;

    if (
      isSponsored &&
      sponsor === "0x0000000000000000000000000000000000000000" &&
      isActive
    ) {
      console.warn(`[Frame API] Drop ${dropId} is an unfunded sponsored game.`);
      fetchError = "This sponsored drop is not funded yet.";
      // We still might want to generate a frame image indicating this.
    }

    const tokenIdsStr = rewardTokenIdsBigInt.map((id) => id.toString());
    const entryFeeTokenForFormatting =
      isPaidEntry &&
      (currentRewardType === RewardType.ERC20 ||
        currentRewardType === RewardType.USDC)
        ? rewardToken
        : "0x0000000000000000000000000000000000000000";

    const formattedEntryFee = await formatAmountServerSide(
      rawEntryFee,
      isPaidEntry
        ? currentRewardType
        : RewardType.ETH /* Assume ETH if free or for display */,
      entryFeeTokenForFormatting
    );
    const formattedRewardAmount = await formatAmountServerSide(
      rawRewardAmount,
      currentRewardType,
      rewardToken
    );

    dropDataForImage = {
      id: Number(dropId),
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
      winners: Array.from(winners),
    };
    console.log(
      `[Frame API] Successfully fetched and formatted drop data for ID ${dropId}`
    );
  } catch (e: any) {
    console.error(`[Frame API] Error fetching drop data for ID ${dropId}:`, e);
    fetchError = `Could not load details for Drop #${dropId}.`;
  }

  // --- Generate Image ---
  let imageBuffer: Buffer | null = null;
  try {
    const svg = await satori(
      React.createElement(FrameImageComponent, {
        drop: dropDataForImage,
        error: fetchError ?? undefined,
      }),
      {
        width: 1200, // For 1.91:1 aspect ratio
        height: 630,
        fonts: [
          // You need to provide font data for satori
          {
            name: "Inter",
            data: await fetch(
              "https://fireball-rho.vercel.app/Inter-Regular.ttf"
            ).then((res) => res.arrayBuffer()), // Host font on your Vercel deployment
            weight: 400,
            style: "normal",
          },
          {
            name: "Inter",
            data: await fetch(
              "https://fireball-rho.vercel.app/Inter-Bold.ttf"
            ).then((res) => res.arrayBuffer()), // Host font
            weight: 700,
            style: "normal",
          },
        ],
      }
    );
    imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    console.log(`[Frame API] Successfully generated image for drop ${dropId}`);
  } catch (imgError: any) {
    console.error(
      `[Frame API] Error generating image for drop ${dropId}:`,
      imgError
    );
    // Fallback image generation or error message in image
    const errorSvg = await satori(
      React.createElement(FrameImageComponent, {
        drop: null,
        error: "Error generating image.",
      }),
      {
        width: 1200,
        height: 630,
        fonts: [
          /* ... font data ... */
        ],
      }
    );
    imageBuffer = await sharp(Buffer.from(errorSvg)).png().toBuffer();
  }

  const imageBase64 = imageBuffer
    ? `data:image/png;base64,${imageBuffer.toString("base64")}`
    : "https://fireball-rho.vercel.app/image.png"; // Fallback static image

  // --- Construct Frame Meta Tag Content ---
  const appUrl = `https://fireball-rho.vercel.app/drop/${dropId}`;

  const fcFrameContent = {
    "fc:frame": "vNext",
    "fc:frame:image": imageBase64,
    "fc:frame:image:aspect_ratio": "1.91:1",
    "fc:frame:button:1": `View Drop #${dropId}`,
    "fc:frame:button:1:action": "link", // 'link' action will open the target URL
    "fc:frame:button:1:target": appUrl,
  };

  // --- Serve HTML with Injected Meta Tags ---
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Fireball Drop ${dropId}</title>
        <meta property="og:title" content="Fireball Drop #${dropId}" />
        <meta property="og:image" content="${imageBase64}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        ${Object.entries(fcFrameContent)
          .map(([key, value]) => `<meta name="${key}" content="${value}" />`)
          .join("\n        ")}
        <meta http-equiv="refresh" content="0; url=${appUrl}" />
      </head>
      <body>
        <h1>Loading Fireball Drop ${dropId}...</h1>
        <p>If you are not redirected, <a href="${appUrl}">click here</a>.</p>
      </body>
    </html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}
