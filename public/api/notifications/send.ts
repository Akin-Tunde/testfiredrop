
import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { targetFids, notification, filters } = req.body;

    // Validate required fields
    if (!notification) {
      return res.status(400).json({ error: "Notification object is required" });
    }

    if (!notification.title || !notification.body || !notification.target_url) {
      return res.status(400).json({ 
        error: "Notification must include title, body, and target_url" 
      });
    }

    // Get the Neynar API key from environment variables
    const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_NEYNAR_API_KEY environment variable is not set");
    }

    // Prepare the request payload
    const payload: any = {
      target_fids: targetFids || [],
      notification: {
        title: notification.title,
        body: notification.body,
        target_url: notification.target_url
      }
    };

    // Add UUID if provided
    if (notification.uuid) {
      payload.notification.uuid = notification.uuid;
    }

    // Add filters if provided
    if (filters) {
      payload.filters = filters;
    }

    // Prepare the request to Neynar API
    const neynarResponse = await fetch(
      "https://api.neynar.com/v2/farcaster/frame/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(payload),
      }
    );

    // Handle API response
    if (!neynarResponse.ok) {
      const errorData = await neynarResponse.json();
      console.error("Neynar API error:", {
        status: neynarResponse.status,
        statusText: neynarResponse.statusText,
        data: errorData
      });
      
      return res.status(neynarResponse.status).json({ 
        error: `Neynar API error: ${neynarResponse.status}`,
        details: errorData
      });
    }

    const data = await neynarResponse.json();
    return res.json(data);
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ 
      error: "Failed to send notification",
      message: error instanceof Error ? error.message : String(error)
    });
  }
}