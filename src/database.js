import { PrismaClient } from "@prisma/client";

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

/**
 * Initialize database and create default config if needed
 */
export async function initializeDatabase() {
  try {
    // Check if email config exists, create default if not
    const configCount = await prisma.emailConfig.count();
    
    if (configCount === 0) {
      await prisma.emailConfig.create({
        data: {
          autoDeleteEnabled: false,
          deleteAfterDays: 30,
          deleteCycle: "daily"
        }
      });
      console.log("✅ Created default email configuration");
    }

    console.log("✅ Database initialized");
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error;
  }
}

/**
 * Create email log entry
 */
export async function createEmailLog({ to, subject, html, text, jobId, status = "queued" }) {
  return await prisma.emailLog.create({
    data: {
      to,
      subject,
      html,
      text,
      jobId,
      status
    }
  });
}

/**
 * Update email log status
 */
export async function updateEmailLogStatus(jobId, status, error = null, sentAt = null) {
  return await prisma.emailLog.update({
    where: { jobId },
    data: {
      status,
      error,
      sentAt: sentAt || (status === "sent" ? new Date() : null),
      attempts: { increment: 1 }
    }
  });
}

/**
 * Get email logs with pagination and filters
 */
export async function getEmailLogs({ 
  page = 1, 
  perPage = 10, 
  status = null, 
  search = null,
  sortBy = "createdAt",
  sortOrder = "desc"
}) {
  const skip = (page - 1) * perPage;
  
  // Build where clause
  const where = {};
  
  if (status) {
    where.status = status;
  }
  
  if (search) {
    where.OR = [
      { to: { contains: search } },
      { subject: { contains: search } }
    ];
  }
  
  // Get total count
  const total = await prisma.emailLog.count({ where });
  
  // Get paginated results
  const results = await prisma.emailLog.findMany({
    where,
    skip,
    take: perPage,
    orderBy: {
      [sortBy]: sortOrder
    }
  });
  
  return {
    data: results,
    total,
    page,
    per_page: perPage,
    pages: Math.ceil(total / perPage)
  };
}

/**
 * Get email log by ID
 */
export async function getEmailLogById(id) {
  return await prisma.emailLog.findUnique({
    where: { id: parseInt(id) }
  });
}

/**
 * Get email log by job ID
 */
export async function getEmailLogByJobId(jobId) {
  return await prisma.emailLog.findUnique({
    where: { jobId }
  });
}

/**
 * Delete email log
 */
export async function deleteEmailLog(id) {
  return await prisma.emailLog.delete({
    where: { id: parseInt(id) }
  });
}

/**
 * Delete old emails based on configuration
 */
export async function deleteOldEmails(days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await prisma.emailLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  });
  
  return result.count;
}

/**
 * Get email configuration
 */
export async function getEmailConfig() {
  let config = await prisma.emailConfig.findFirst();
  
  if (!config) {
    config = await prisma.emailConfig.create({
      data: {
        autoDeleteEnabled: false,
        deleteAfterDays: 30,
        deleteCycle: "daily"
      }
    });
  }
  
  return config;
}

/**
 * Update email configuration
 */
export async function updateEmailConfig(data) {
  const config = await getEmailConfig();
  
  return await prisma.emailConfig.update({
    where: { id: config.id },
    data
  });
}

/**
 * Update last cleanup timestamp
 */
export async function updateLastCleanup() {
  const config = await getEmailConfig();
  
  return await prisma.emailConfig.update({
    where: { id: config.id },
    data: {
      lastCleanupAt: new Date()
    }
  });
}
