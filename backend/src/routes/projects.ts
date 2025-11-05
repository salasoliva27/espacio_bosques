import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /api/projects
 * Get all projects with optional filters
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, category, planner } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (planner) where.plannerId = planner;

    const projects = await prisma.project.findMany({
      where,
      include: {
        planner: {
          select: {
            id: true,
            walletAddress: true,
            role: true,
          },
        },
        milestones: {
          select: {
            id: true,
            title: true,
            status: true,
            fundingPercentage: true,
          },
        },
        _count: {
          select: {
            investments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ projects });
  } catch (error: any) {
    logger.error("Failed to fetch projects", { error: error.message });
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        planner: {
          select: {
            id: true,
            walletAddress: true,
            role: true,
          },
        },
        milestones: {
          orderBy: { createdAt: "asc" },
        },
        investments: {
          include: {
            investor: {
              select: {
                id: true,
                walletAddress: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        telemetry: {
          orderBy: { timestamp: "desc" },
          take: 50,
        },
        reports: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ project });
  } catch (error: any) {
    logger.error("Failed to fetch project", { error: error.message, id: req.params.id });
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      plannerId,
      title,
      summary,
      category,
      fundingGoal,
      metadataURI,
      aiGenerated,
      aiBlueprint,
      milestones,
    } = req.body;

    // Validate required fields
    if (!plannerId || !title || !summary || !fundingGoal || !metadataURI) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user exists and has planner role
    const user = await prisma.user.findUnique({
      where: { id: plannerId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.verified) {
      return res.status(403).json({ error: "User not verified" });
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        plannerId,
        title,
        summary,
        category: category || "community",
        fundingGoal,
        metadataURI,
        aiGenerated: aiGenerated || false,
        aiBlueprint: aiBlueprint || null,
        status: "PENDING",
        chainId: parseInt(process.env.CHAIN_ID || "31337"),
        contractId: 0, // Will be updated when created on-chain
      },
    });

    // Create milestones if provided
    if (milestones && Array.isArray(milestones)) {
      for (const milestone of milestones) {
        await prisma.milestone.create({
          data: {
            projectId: project.id,
            title: milestone.title,
            description: milestone.description,
            fundingPercentage: milestone.fundingPercentage,
            durationDays: milestone.durationDays,
            status: "PENDING",
          },
        });
      }
    }

    logger.info("Project created", { projectId: project.id, title: project.title });

    res.status(201).json({ project });
  } catch (error: any) {
    logger.error("Failed to create project", { error: error.message });
    res.status(500).json({ error: "Failed to create project" });
  }
});

/**
 * POST /api/projects/:id/invest
 * Record an investment (after on-chain transaction)
 */
router.post("/:id/invest", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { investorId, amount, txHash } = req.body;

    if (!investorId || !amount || !txHash) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check for duplicate transaction
    const existingInvestment = await prisma.investment.findUnique({
      where: { txHash },
    });

    if (existingInvestment) {
      return res.status(400).json({ error: "Investment already recorded" });
    }

    // Record investment
    const investment = await prisma.investment.create({
      data: {
        projectId: id,
        investorId,
        amount,
        txHash,
        chainId: parseInt(process.env.CHAIN_ID || "31337"),
      },
    });

    logger.info("Investment recorded", {
      projectId: id,
      investorId,
      amount,
      txHash,
    });

    res.status(201).json({ investment });
  } catch (error: any) {
    logger.error("Failed to record investment", { error: error.message });
    res.status(500).json({ error: "Failed to record investment" });
  }
});

/**
 * POST /api/projects/:id/milestone/submit
 * Submit milestone evidence
 */
router.post("/:id/milestone/submit", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { milestoneId, evidenceURI } = req.body;

    if (!milestoneId || !evidenceURI) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update milestone
    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: "SUBMITTED",
        evidenceURI,
        submittedAt: new Date(),
      },
    });

    logger.info("Milestone submitted", { projectId: id, milestoneId, evidenceURI });

    res.json({ milestone });
  } catch (error: any) {
    logger.error("Failed to submit milestone", { error: error.message });
    res.status(500).json({ error: "Failed to submit milestone" });
  }
});

export default router;
