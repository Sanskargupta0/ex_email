import express from "express";
import { authenticateToken, requireAdmin } from "../auth.js";
import {
  getEmailConfig,
  updateEmailConfig,
  deleteOldEmails,
  updateLastCleanup
} from "../database.js";

const router = express.Router();

/**
 * GET /api/config - Get email auto-delete configuration
 * Requires: email_service tool access
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const config = await getEmailConfig();
    return res.json(config);
  } catch (error) {
    console.error("Error fetching config:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

/**
 * PUT /api/config - Update email auto-delete configuration
 * Requires: Admin privileges
 * Body:
 *   - autoDeleteEnabled: boolean
 *   - deleteAfterDays: number
 *   - deleteCycle: "daily" | "weekly" | "monthly"
 */
router.put("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { autoDeleteEnabled, deleteAfterDays, deleteCycle } = req.body;

    // Validate input
    if (autoDeleteEnabled !== undefined && typeof autoDeleteEnabled !== "boolean") {
      return res.status(400).json({ 
        message: "autoDeleteEnabled must be a boolean" 
      });
    }

    if (deleteAfterDays !== undefined) {
      const days = parseInt(deleteAfterDays);
      if (isNaN(days) || days < 1) {
        return res.status(400).json({ 
          message: "deleteAfterDays must be a positive number" 
        });
      }
    }

    if (deleteCycle !== undefined) {
      const validCycles = ["daily", "weekly", "monthly"];
      if (!validCycles.includes(deleteCycle)) {
        return res.status(400).json({ 
          message: `deleteCycle must be one of: ${validCycles.join(", ")}` 
        });
      }
    }

    const updateData = {};
    if (autoDeleteEnabled !== undefined) updateData.autoDeleteEnabled = autoDeleteEnabled;
    if (deleteAfterDays !== undefined) updateData.deleteAfterDays = parseInt(deleteAfterDays);
    if (deleteCycle !== undefined) updateData.deleteCycle = deleteCycle;

    const config = await updateEmailConfig(updateData);

    return res.json({
      message: "Configuration updated successfully",
      config
    });
  } catch (error) {
    console.error("Error updating config:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

/**
 * POST /api/config/cleanup - Manually trigger email cleanup
 * Requires: Admin privileges
 */
router.post("/cleanup", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const config = await getEmailConfig();
    const deletedCount = await deleteOldEmails(config.deleteAfterDays);
    await updateLastCleanup();

    return res.json({
      message: "Cleanup completed successfully",
      deletedCount,
      deleteAfterDays: config.deleteAfterDays
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
});

export default router;
