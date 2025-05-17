// public/api/notifications/send.ts
import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { targetFids, notification } = req.body;

    // Get the Neynar API key from environment variables
    const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_NEYNAR_API_KEY environment variable is not set");
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
        } ),
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
    return res.json(data);
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ error: "Failed to send notification" });
  }
}
