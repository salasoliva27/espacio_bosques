import { Router, Request, Response } from "express";
import { simulateDroneTelemetry, simulateDroneHistory } from "../ai/adapters/drone_simulator";
import { logger } from "../utils/logger";

const router = Router();

/**
 * POST /api/simulate/drone/:projectId
 * Simulate drone telemetry for a project
 */
router.post("/drone/:projectId", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    logger.info("Drone telemetry simulation requested", { projectId });

    const telemetry = await simulateDroneTelemetry(projectId);

    res.json({
      success: true,
      telemetry,
    });
  } catch (error: any) {
    logger.error("Drone simulation failed", {
      error: error.message,
      projectId: req.params.projectId,
    });

    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: "Failed to simulate drone telemetry",
      details: error.message,
    });
  }
});

/**
 * POST /api/simulate/drone/:projectId/history
 * Simulate historical drone telemetry
 */
router.post("/drone/:projectId/history", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { eventCount } = req.body;

    const count = eventCount || 20;

    logger.info("Historical drone telemetry simulation requested", {
      projectId,
      eventCount: count,
    });

    await simulateDroneHistory(projectId, count);

    res.json({
      success: true,
      message: `Successfully simulated ${count} historical telemetry events`,
    });
  } catch (error: any) {
    logger.error("Historical drone simulation failed", {
      error: error.message,
      projectId: req.params.projectId,
    });

    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({
      error: "Failed to simulate historical drone telemetry",
      details: error.message,
    });
  }
});

export default router;
