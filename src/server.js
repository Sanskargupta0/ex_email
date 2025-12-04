import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

import { emailQueue } from "./queue.js";
import { matchSecretKey } from "./auth.js";
import { initializeDatabase, createEmailLog } from "./database.js";
import { initializeScheduler } from "./scheduler.js";
import emailRoutes from "./routes/emails.js";
import configRoutes from "./routes/config.js";
import logger from "./logger.js";

const app = express();
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// CORS configuration
app.use(cors({
    origin: [
      process.env.TASK_SERVICE_URL || "http://localhost:8002",
      "https://task.api.electronicx.app/",
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-secret-key', 'token'],
    exposedHeaders: ['Content-Type', 'Authorization', 'x-secret-key', 'token'],
    credentials: true
}))

// ✅ Global CORS Response Headers Middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-secret-key, Authorization, token");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});

// Initialize database and scheduler
logger.info("Initializing database...");
await initializeDatabase();
logger.info("Database initialized successfully");

logger.info("Starting scheduler...");
initializeScheduler();
logger.info("Scheduler started successfully");

// Health check endpoint (no auth required)
app.get("/api/health", (req, res) => {
  logger.debug("Health check requested");
  res.json({ status: "ok", service: "email-service" });
});

// Mount routes
app.use("/api", emailRoutes);
app.use("/api/config", configRoutes);

// Send email endpoint
app.post("/api/send-email", matchSecretKey, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    logger.info(`Email request received: to=${to}, subject="${subject}"`);

    if (!to || !subject || (!html && !text)) {
      logger.warn(`Invalid email request: missing fields`, { to, subject, hasHtml: !!html, hasText: !!text });
      return res.status(400).json({ message: "Missing email fields" });
    }

    // Add job to queue
    logger.debug(`Adding job to queue for ${to}`);
    const job = await emailQueue.add(
      { to, subject, html, text },
      {
        attempts: 3,        // retry up to 3 times
        backoff: 5000,      // wait 5s between retries
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
    logger.info(`Job added to queue: jobId=${job.id}`);


    // Create database log entry
    logger.debug(`Creating email log entry for jobId=${job.id}`);
    const emailLog = await createEmailLog({
      to,
      subject,
      html,
      text,
      jobId: job.id.toString(),
      status: "queued"
    });
    logger.info(`Email log created: emailId=${emailLog.id}, jobId=${job.id}`);


    // Respond immediately – async processing
    logger.info(`Email queued successfully: emailId=${emailLog.id}, jobId=${job.id}, to=${to}`);
    return res.status(202).json({
      message: "Email queued",
      jobId: job.id,
      emailId: emailLog.id
    });
  } catch (err) {
    logger.error("Error queuing email:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 Email API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
});
