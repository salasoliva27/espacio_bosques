import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { createProjectWithAI } from "../ai/project_creator";
import { generateReport } from "../ai/report_generator";
import { queryKnowledge, formatKnowledgeContext } from "../knowledge/base";
import { prisma } from "../index";
import { logger } from "../utils/logger";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

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

/**
 * POST /api/ai/refine-blueprint
 * Conversational refinement of an existing blueprint.
 * Takes the current blueprint + chat history + new user message.
 * Returns an updated blueprint + the AI's conversational response.
 */
router.post("/refine-blueprint", async (req: Request, res: Response) => {
  try {
    const { currentBlueprint, message, conversationHistory = [] } = req.body;

    if (!currentBlueprint || !message) {
      return res.status(400).json({ error: "Missing currentBlueprint or message" });
    }

    const relevantKnowledge = queryKnowledge(message + " " + currentBlueprint.title);
    const knowledgeContext = formatKnowledgeContext(relevantKnowledge);

    const systemPrompt = `You are a collaborative project planner for Espacio Bosques — a community funding platform for Bosques de las Lomas, an upscale residential neighborhood in Mexico City (CDMX). NOT a forest. A colonia.

You are helping a resident refine a community project blueprint through conversation. Your role:
1. Listen to their feedback and requests
2. Update the blueprint accordingly
3. Explain what you changed and why, briefly
4. Ask a focused follow-up question if something needs clarification
5. When the blueprint feels complete, say so and invite them to submit

CRITICAL: Your ENTIRE response must be a single valid JSON object. No text before or after. No markdown. No code fences. Just raw JSON:
{"blueprint": { ...full updated blueprint... }, "message": "your short conversational reply"}

The message field must be plain text with no special characters that would break JSON (no unescaped quotes or backslashes inside strings).

Blueprint schema:
{
  "title": "string (max 100 chars, English)",
  "summary": "string (max 1000 chars, English, specific to Bosques de las Lomas)",
  "category": "one of: infrastructure, environment, community, technology, education",
  "milestones": [{ "title": string, "description": string, "fundingPercentage": number, "durationDays": number }],
  "monitoringHints": ["string"]
}

Milestones must always sum to 100% funding. Be specific — use real street names, realistic CDMX timelines, and informed cost guidance.
${knowledgeContext}`;

    const messages = [
      ...conversationHistory,
      {
        role: "user" as const,
        content: `Current blueprint:\n${JSON.stringify(currentBlueprint, null, 2)}\n\nMy request: ${message}`,
      },
    ];

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    const textContent = response.content.find((b) => b.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    let jsonText = textContent.text.trim();
    // Strip markdown code fences
    if (jsonText.startsWith("```json")) jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    else if (jsonText.startsWith("```")) jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");

    // Find the outermost JSON object even if there is prose before/after
    const jsonStart = jsonText.indexOf("{");
    const jsonEnd = jsonText.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonText = jsonText.slice(jsonStart, jsonEnd + 1);
    }

    let result: any;
    try {
      result = JSON.parse(jsonText);
    } catch (parseErr: any) {
      // Last-resort: try to salvage just the blueprint object from the raw text
      logger.warn("JSON parse failed, attempting blueprint extraction", { error: parseErr.message });
      const bpMatch = textContent.text.match(/"blueprint"\s*:\s*(\{[\s\S]+?\})\s*,?\s*"message"/);
      if (bpMatch) {
        try {
          const salvaged = JSON.parse(`{"blueprint":${bpMatch[1]},"message":"I updated the blueprint. What else would you like to change?"}`);
          result = salvaged;
        } catch {
          throw new Error(`Could not parse AI response as JSON: ${parseErr.message}`);
        }
      } else {
        throw new Error(`Could not parse AI response as JSON: ${parseErr.message}`);
      }
    }

    logger.info("Blueprint refined", { title: result.blueprint?.title });

    res.json({
      success: true,
      blueprint: result.blueprint,
      message: result.message,
      assistantMessage: {
        role: "assistant",
        content: textContent.text,
      },
    });
  } catch (error: any) {
    logger.error("Blueprint refinement failed", { error: error.message });
    res.status(500).json({ error: "Failed to refine blueprint", details: error.message });
  }
});

export default router;
