import dotenv from "dotenv";
dotenv.config();

import { emailQueue } from "./queue.js";
import { sendEmail } from "./mailer.js";
import { updateEmailLogStatus, getEmailLogByJobId } from "./database.js";

emailQueue.process(async (job, done) => {
  try {
    const { to, subject, html, text } = job.data;
    const jobId = job.id.toString();

    // Update status to pending
    try {
      await updateEmailLogStatus(jobId, "pending");
    } catch (dbErr) {
      console.warn(`Could not update status to pending for job ${jobId}:`, dbErr.message);
    }

    // Send email
    await sendEmail({ to, subject, html, text });

    // Update status to sent
    try {
      await updateEmailLogStatus(jobId, "sent", null, new Date());
    } catch (dbErr) {
      console.warn(`Could not update status to sent for job ${jobId}:`, dbErr.message);
    }

    console.log(`✅ Email sent to ${to} (Job ${jobId})`);
    done();
  } catch (err) {
    console.error("❌ Error sending email:", err);
    
    // Update status to failed
    const jobId = job.id.toString();
    try {
      await updateEmailLogStatus(jobId, "failed", err.message);
    } catch (dbErr) {
      console.warn(`Could not update status to failed for job ${jobId}:`, dbErr.message);
    }
    
    done(err);
  }
});

// Optional: event listeners
emailQueue.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

emailQueue.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

console.log("📨 Email worker started...");
