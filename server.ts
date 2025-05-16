import express from "express";
import cors from "cors";
import sendAppNotification from "./api/send-app-notification.ts";
import webhook from "./api/webhook.ts";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/send-app-notification", async (req, res) => {
  try {
    await sendAppNotification(req, res);
  } catch (error) {
    console.error("Error in send-app-notification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/send-welcome-notification", (req, res) => {
  res.json({ message: "Welcome notification sent" });
});

app.post("/api/webhook", async (req, res) => {
  try {
    await webhook(req, res);
  } catch (error) {
    console.error("Error in webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
