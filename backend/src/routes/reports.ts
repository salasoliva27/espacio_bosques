import { Router, Request, Response } from "express";
import { prisma } from "../index";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /api/reports/:projectId
 * Get all reports for a project
 */
router.get("/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { type, limit } = req.query;

    const where: any = { projectId };
    if (type) where.type = type;

    const reports = await prisma.report.findMany({
      where,
      include: {
        generator: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ reports });
  } catch (error: any) {
    logger.error("Failed to fetch reports", {
      error: error.message,
      projectId: req.params.projectId,
    });
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

/**
 * GET /api/reports/details/:reportId
 * Get report details
 */
router.get("/details/:reportId", async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        generator: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ report });
  } catch (error: any) {
    logger.error("Failed to fetch report", {
      error: error.message,
      reportId: req.params.reportId,
    });
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

export default router;
