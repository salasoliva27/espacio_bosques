import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { logger } from "../utils/logger";
import { SIMULATION_MODE } from "../config/mode";

// Demo projects used when no database is available (simulation mode)
const DEMO_PROJECTS = [
  {
    id: "demo-project-001",
    title: "Vigilancia Forestal con Drones",
    summary: "Sistema de monitoreo aéreo para detectar incendios forestales y actividad ilegal en el bosque de Bosques de las Lomas.",
    category: "ENVIRONMENTAL",
    status: "ACTIVE",
    fundingGoal: "50000000000000000000000",
    fundingRaised: "18500000000000000000000",
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-04-01"),
    planner: { id: "planner-001", walletAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", role: "PLANNER" },
    milestones: [
      { id: "m1", title: "Adquisición de drones", status: "COMPLETED", fundingPercentage: 30, description: "Compra de 3 drones DJI Matrice", durationDays: 30 },
      { id: "m2", title: "Instalación de estaciones base", status: "IN_PROGRESS", fundingPercentage: 40, description: "Instalación de 5 estaciones de carga solar", durationDays: 60 },
      { id: "m3", title: "Sistema de alertas IA", status: "PENDING", fundingPercentage: 30, description: "Entrenamiento y despliegue del modelo de detección", durationDays: 45 },
    ],
    investments: [
      { id: "inv1", amount: "5000000000000000000000", investor: { id: "u1", walletAddress: "0xsim001" } },
      { id: "inv2", amount: "3500000000000000000000", investor: { id: "u2", walletAddress: "0xsim002" } },
    ],
    telemetry: [
      { id: "t1", timestamp: new Date(), data: { uptimePercent: 98.5, batteryPercent: 87 } },
    ],
    reports: [],
    _count: { investments: 2 },
  },
  {
    id: "demo-project-002",
    title: "Jardín Comunitario Orgánico",
    summary: "Transformar lotes baldíos en huertos comunitarios que provean alimentos frescos y espacios de convivencia para residentes de Bosques.",
    category: "COMMUNITY",
    status: "ACTIVE",
    fundingGoal: "20000000000000000000000",
    fundingRaised: "4200000000000000000000",
    createdAt: new Date("2026-02-20"),
    updatedAt: new Date("2026-04-02"),
    planner: { id: "planner-002", walletAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", role: "PLANNER" },
    milestones: [
      { id: "m4", title: "Preparación del terreno", status: "COMPLETED", fundingPercentage: 25, description: "Limpieza, nivelación y preparación del suelo", durationDays: 21 },
      { id: "m5", title: "Instalación de riego", status: "PENDING", fundingPercentage: 35, description: "Sistema de riego por goteo solar", durationDays: 30 },
      { id: "m6", title: "Primera cosecha", status: "PENDING", fundingPercentage: 40, description: "Siembra y seguimiento hasta primera cosecha", durationDays: 90 },
    ],
    investments: [
      { id: "inv3", amount: "4200000000000000000000", investor: { id: "u3", walletAddress: "0xsim003" } },
    ],
    telemetry: [],
    reports: [],
    _count: { investments: 1 },
  },
];

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
    if (SIMULATION_MODE()) {
      logger.warn("DB unavailable — returning demo projects (simulation mode)");
      return res.json({ projects: DEMO_PROJECTS });
    }
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
    if (SIMULATION_MODE()) {
      const demo = DEMO_PROJECTS.find((p) => p.id === req.params.id) || DEMO_PROJECTS[0];
      logger.warn("DB unavailable — returning demo project (simulation mode)");
      return res.json({ project: demo });
    }
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
