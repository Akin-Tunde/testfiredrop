// src/utils/notifications.ts
interface NotificationPayload {
  title: string;
  body: string;
  target_url: string;
}

export async function sendDropCreationNotification(
  creatorAddress: string,
  dropId: string,
  amount: string,
  currency: string
): Promise<void> {
  try {
    // Format the notification message
    const title = "🔥 New FireBall Drop Created";
    const body = `${creatorAddress.substring(0, 6)}...${creatorAddress.substring(
      creatorAddress.length - 4
    )} created a new drop with ${amount} ${currency}`;
    const target_url = `${window.location.origin}/drop/${dropId}`;

    // Prepare the notification payload
    const notification: NotificationPayload = {
      title,
      body,
      target_url,
    };

    // Send the notification using fetch
    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targetFids: [], // Empty array to target all users with notifications enabled
        notification,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.statusText}`);
    }

    console.log("Drop creation notification sent successfully");
  } catch (error) {
    console.error("Error sending drop creation notification:", error);
    // Don't show error toast to user as this is a background operation
  }
}
