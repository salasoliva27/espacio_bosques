import { Router, Request, Response } from "express";
import { createProjectWithAI } from "../ai/project_creator";
import { generateReport } from "../ai/report_generator";
import { prisma } from "../index";
import { logger } from "../utils/logger";

const router = Router();

/**
 * POST /api/ai/create-project
 * Use AI to create a project blueprint from a user prompt
 */
router.post("/create-project", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing or invalid prompt" });
    }

    if (prompt.length < 10) {
      return res.status(400).json({ error: "Prompt too short (minimum 10 characters)" });
    }

    logger.info("AI project creation requested", { promptLength: prompt.length });

    // Call AI to create project blueprint
    const blueprint = await createProjectWithAI(prompt);

    logger.info("AI project blueprint created successfully", {
      title: blueprint.title,
      category: blueprint.category,
      milestonesCount: blueprint.milestones.length,
    });

    res.json({
      success: true,
      blueprint,
    });
  } catch (error: any) {
    logger.error("AI project creation failed", { error: error.message });

    if (error.message.includes("ANTHROPIC_API_KEY")) {
      return res.status(500).json({
        error: "AI service not configured. Please add ANTHROPIC_API_KEY to .env file.",
        details: error.message,
      });
    }

    res.status(500).json({
      error: "Failed to create project blueprint",
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/generate-report/:projectId
 * Generate an AI report for a project
 */
router.post("/generate-report/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { generatorId } = req.body;

    if (!generatorId) {
      return res.status(400).json({ error: "Missing generatorId" });
    }

    logger.info("AI report generation requested", { projectId });

    // Generate AI report
    const aiReport = await generateReport(projectId);

    // Store report in database
    const report = await prisma.report.create({
      data: {
        projectId,
        generatorId,
        type: "SUMMARY",
        title: aiReport.title,
        content: JSON.stringify(aiReport),
        summary: aiReport.summary,
        anomalies: aiReport.anomalies,
      },
    });

    logger.info("AI report generated and stored", {
      projectId,
      reportId: report.id,
      anomaliesCount: aiReport.anomalies.length,
    });

    res.json({
      success: true,
      report: {
        id: report.id,
        ...aiReport,
      },
    });
  } catch (error: any) {
    logger.error("AI report generation failed", {
      error: error.message,
      projectId: req.params.projectId,
    });

    if (error.message.includes("ANTHROPIC_API_KEY")) {
      return res.status(500).json({
        error: "AI service not configured. Please add ANTHROPIC_API_KEY to .env file.",
        details: error.message,
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: "Failed to generate report",
      details: error.message,
    });
  }
});

export default router;
