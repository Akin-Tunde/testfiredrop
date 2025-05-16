// public/api/notifications/send.ts
import { NextRequest, NextResponse } from "next/server";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { targetFids, notification } = await req.json();

    // Get the Neynar API key from environment variables
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      throw new Error("NEYNAR_API_KEY environment variable is not set");
    }

    // Prepare the request to Neynar API
    const neynarResponse = await fetch(
      "https://api.neynar.com/v2/farcaster/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          target_fids: targetFids,
          notification,
        }),
      }
    );

    if (!neynarResponse.ok) {
      const errorData = await neynarResponse.json();
      throw new Error(
        `Neynar API error: ${neynarResponse.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const data = await neynarResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
