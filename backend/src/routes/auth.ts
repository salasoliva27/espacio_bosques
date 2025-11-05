import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import jwt from "jsonwebtoken";
import { prisma } from "../index";
import { logger } from "../utils/logger";

const router = Router();

interface LoginRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

/**
 * POST /api/auth/login
 * Login with web3 wallet signature
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message }: LoginRequest = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          walletAddress: walletAddress.toLowerCase(),
          role: "MEMBER",
          verified: false, // Set to true after verification process
        },
      });

      logger.info("New user registered", { walletAddress: user.walletAddress });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    logger.info("User logged in", { userId: user.id, walletAddress: user.walletAddress });

    res.json({
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        role: user.role,
        verified: user.verified,
        kycStatus: user.kycStatus,
      },
    });
  } catch (error: any) {
    logger.error("Login failed", { error: error.message });
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      verified: user.verified,
      kycStatus: user.kycStatus,
    });
  } catch (error: any) {
    logger.error("Failed to get user", { error: error.message });
    res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;
