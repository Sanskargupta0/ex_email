import express from "express";
import { authenticateToken } from "../auth.js";
import {
  getEmailLogs,
  getEmailLogById,
  deleteEmailLog
} from "../database.js";
import { emailQueue } from "../queue.js";

const router = express.Router();

/**
 * GET /api/emails - Get list of emails with pagination and filters
 * Query params:
 *   - page: Page number (default: 1)
 *   - per_page: Items per page (default: 10)
 *   - status: Filter by status (pending, queued, sent, failed)
 *   - search: Search in recipient email or subject
 *   - sort_by: Sort field (default: createdAt)
 *   - sort_order: Sort order (asc, desc, default: desc)
 */
router.get("/emails", authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      per_page = 10,
      status,
      search,
      sort_by = "createdAt",
      sort_order = "desc"
    } = req.query;

    const result = await getEmailLogs({
      page: parseInt(page),
      perPage: parseInt(per_page),
      status,
      search,
      sortBy: sort_by,
      sortOrder: sort_order
    });

    return res.json(result);
  } catch (error) {
    console.error("Error fetching emails:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

/**
 * POST /api/emails/:id/retry - Retry failed email
 */
router.post("/emails/:id/retry", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const email = await getEmailLogById(id);

    if (!email) {
      return res.status(404).json({ 
        message: "Email not found" 
      });
    }

    if (email.status === "sent") {
      return res.status(400).json({ 
        message: "Email was already sent successfully" 
      });
    }

    // Re-add to queue
    const job = await emailQueue.add(
      {
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailLogId: email.id
      },
      {
        attempts: 3,
        backoff: 5000,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    return res.json({
      message: "Email queued for retry",
      jobId: job.id,
      emailId: email.id
    });
  } catch (error) {
    console.error("Error retrying email:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

/**
 * DELETE /api/emails/:id - Delete email log
 */
router.delete("/emails/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const email = await getEmailLogById(id);

    if (!email) {
      return res.status(404).json({ 
        message: "Email not found" 
      });
    }

    await deleteEmailLog(id);

    return res.json({
      message: "Email deleted successfully",
      id: parseInt(id)
    });
  } catch (error) {
    console.error("Error deleting email:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

/**
 * GET /api/emails/stats - Get email statistics
 */
router.get("/emails/stats/summary", authenticateToken, async (req, res) => {
  try {
    const { prisma } = await import("./database.js");
    
    const [total, sent, failed, pending, queued] = await Promise.all([
      prisma.emailLog.count(),
      prisma.emailLog.count({ where: { status: "sent" } }),
      prisma.emailLog.count({ where: { status: "failed" } }),
      prisma.emailLog.count({ where: { status: "pending" } }),
      prisma.emailLog.count({ where: { status: "queued" } })
    ]);

    return res.json({
      total,
      sent,
      failed,
      pending,
      queued
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

export default router;
