import dotenv from "dotenv";
dotenv.config();

import { emailQueue } from "./queue.js";
import { sendEmail } from "./mailer.js";
import { updateEmailLogStatus, getEmailLogByJobId } from "./database.js";
import logger from "./logger.js";

emailQueue.process(async (job, done) => {
  try {
    const { to, subject, html, text } = job.data;
    const jobId = job.id.toString();
    
    logger.info(`Processing email job: jobId=${jobId}, to=${to}`);

    // Update status to pending
    try {
      await updateEmailLogStatus(jobId, "pending");
      logger.debug(`Status updated to pending for job ${jobId}`);
    } catch (dbErr) {
      logger.warn(`Could not update status to pending for job ${jobId}:`, dbErr.message);
    }

    // Send email
    logger.info(`Sending email: jobId=${jobId}, to=${to}, subject="${subject}"`);
    await sendEmail({ to, subject, html, text });
    logger.info(`✅ Email sent successfully: jobId=${jobId}, to=${to}`);


    // Update status to sent
    try {
      await updateEmailLogStatus(jobId, "sent", null, new Date());
      logger.debug(`Status updated to sent for job ${jobId}`);
    } catch (dbErr) {
      logger.warn(`Could not update status to sent for job ${jobId}:`, dbErr.message);
    }

    logger.info(`✅ Job completed: jobId=${jobId}`);
    done();
  } catch (err) {
    const jobId = job.id.toString();
    logger.error(`❌ Error processing job ${jobId}:`, err);
    
    // Update status to failed
    const jobId = job.id.toString();
    try {
      await updateEmailLogStatus(jobId, "failed", err.message);
      logger.debug(`Status updated to failed for job ${jobId}`);
    } catch (dbErr) {
      logger.warn(`Could not update status to failed for job ${jobId}:`, dbErr.message);
    }
    
    done(err);
  }
});

// Optional: event listeners
emailQueue.on("failed", (job, err) => {
  logger.error(`❌ Job ${job.id} failed after all retries:`, err);
});

emailQueue.on("completed", (job) => {
  logger.info(`✅ Job ${job.id} completed successfully`);
});

logger.info("📨 Email worker started successfully");
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
logger.info("Waiting for jobs...");
