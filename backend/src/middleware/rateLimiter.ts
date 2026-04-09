import rateLimit from "express-rate-limit";

const isSimulation = process.env.SIMULATION_MODE === "true";

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
  max: isSimulation
    ? 10000
    : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isSimulation && req.ip === "::1",
});
