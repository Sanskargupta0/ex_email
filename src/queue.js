import Queue from "bull";
import dotenv from "dotenv";
dotenv.config();

export const emailQueue = new Queue("email-queue", process.env.REDIS_URL);
