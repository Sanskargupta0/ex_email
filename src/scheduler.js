import cron from "node-cron";
import {
  getEmailConfig,
  deleteOldEmails,
  updateLastCleanup
} from "./database.js";

let scheduledJob = null;

/**
 * Calculate next cleanup time based on cycle
 */
function getNextCleanupTime(cycle, lastCleanup) {
  if (!lastCleanup) return true; // Run immediately if never run

  const now = new Date();
  const last = new Date(lastCleanup);

  switch (cycle) {
    case "daily":
      // Run if last cleanup was more than 24 hours ago
      return (now - last) > (24 * 60 * 60 * 1000);
    
    case "weekly":
      // Run if last cleanup was more than 7 days ago
      return (now - last) > (7 * 24 * 60 * 60 * 1000);
    
    case "monthly":
      // Run if last cleanup was more than 30 days ago
      return (now - last) > (30 * 24 * 60 * 60 * 1000);
    
    default:
      return false;
  }
}

/**
 * Perform email cleanup
 */
async function performCleanup() {
  try {
    const config = await getEmailConfig();

    if (!config.autoDeleteEnabled) {
      console.log("⏭️  Auto-delete is disabled, skipping cleanup");
      return;
    }

    // Check if cleanup should run based on cycle
    const shouldCleanup = getNextCleanupTime(config.deleteCycle, config.lastCleanupAt);

    if (!shouldCleanup) {
      console.log("⏭️  Not time for cleanup yet based on cycle");
      return;
    }

    console.log(`🧹 Starting email cleanup (deleteAfterDays: ${config.deleteAfterDays}, cycle: ${config.deleteCycle})`);

    const deletedCount = await deleteOldEmails(config.deleteAfterDays);
    await updateLastCleanup();

    console.log(`✅ Cleanup completed: ${deletedCount} emails deleted`);
  } catch (error) {
    console.error("❌ Error during scheduled cleanup:", error);
  }
}

/**
 * Initialize scheduled cleanup job
 */
export function initializeScheduler() {
  // Stop existing job if any
  if (scheduledJob) {
    scheduledJob.stop();
  }

  // Run every hour (can be adjusted based on needs)
  // Cron expression: "0 * * * *" means "at minute 0 of every hour"
  scheduledJob = cron.schedule("0 * * * *", async () => {
    console.log("⏰ Scheduled cleanup check triggered");
    await performCleanup();
  });

  console.log("📅 Email cleanup scheduler initialized (runs hourly)");

  // Run initial check after 1 minute
  setTimeout(async () => {
    console.log("🔄 Running initial cleanup check");
    await performCleanup();
  }, 60000);
}

/**
 * Stop scheduler
 */
export function stopScheduler() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log("⏹️  Email cleanup scheduler stopped");
  }
}
