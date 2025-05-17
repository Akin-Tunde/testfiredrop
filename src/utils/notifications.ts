
// src/utils/notifications.ts
interface NotificationPayload {
  title: string;
  body: string;
  target_url: string;
  uuid?: string; // Optional UUID for tracking notifications
}

interface NotificationFilters {
  exclude_fids?: number[];
  following_fid?: number;
  minimum_user_score?: number;
  near_location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

export async function sendDropCreationNotification(
  creatorAddress: string,
  dropId: string,
  amount: string,
  currency: string,
  filters?: NotificationFilters
): Promise<void> {
  try {
    // Format the notification message
    const title = "🔥 New FireBall Drop Created";
    const body = `${creatorAddress.substring(0, 6)}...${creatorAddress.substring(
      creatorAddress.length - 4
    )} created a new drop with ${amount} ${currency}`;
    const target_url = `${window.location.origin}/drop/${dropId}`;
    
    // Generate a UUID for tracking this notification
    const uuid = crypto.randomUUID();

    // Prepare the notification payload
    const notification: NotificationPayload = {
      title,
      body,
      target_url,
      uuid
    };

    // Prepare the request payload
    const payload: any = {
      targetFids: [], // Empty array to target all users with notifications enabled
      notification
    };

    // Add filters if provided
    if (filters) {
      payload.filters = filters;
    }

    // Send the notification using fetch
    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send notification: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log("Drop creation notification sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Error sending drop creation notification:", error);
    // Don't show error toast to user as this is a background operation
    return undefined;
  }
}

// New function to send targeted notifications to specific users
export async function sendTargetedNotification(
  targetFids: number[],
  title: string,
  body: string,
  targetUrl: string,
  filters?: NotificationFilters
): Promise<any> {
  try {
    if (!targetFids || targetFids.length === 0) {
      console.warn("No target FIDs provided for targeted notification");
      return;
    }

    // Generate a UUID for tracking this notification
    const uuid = crypto.randomUUID();

    // Prepare the notification payload
    const notification: NotificationPayload = {
      title,
      body,
      target_url: targetUrl,
      uuid
    };

    // Prepare the request payload
    const payload: any = {
      targetFids,
      notification
    };

    // Add filters if provided
    if (filters) {
      payload.filters = filters;
    }

    // Send the notification using fetch
    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send targeted notification: ${response.statusText}. Details: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log("Targeted notification sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Error sending targeted notification:", error);
    throw error;
  }
}
