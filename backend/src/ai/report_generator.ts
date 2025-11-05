import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../index";
import { logger } from "../utils/logger";
import projectConfig from "../../../config/project-config.json";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

interface AIReport {
  title: string;
  summary: string;
  anomalies: {
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    recommendation: string;
  }[];
  milestoneProgress: {
    milestoneId: string;
    status: string;
    assessment: string;
  }[];
  fundingStatus: {
    raised: string;
    goal: string;
    percentComplete: number;
    assessment: string;
  };
  recommendations: string[];
}

/**
 * Generate an AI report for a project based on telemetry and state
 */
export async function generateReport(
  projectId: string,
  retries = 3
): Promise<AIReport> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Please add your API key to .env file. " +
      "Get your key from https://console.anthropic.com/"
    );
  }

  logger.info(`Generating AI report for project ${projectId}`);

  // Fetch project data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      milestones: true,
      telemetry: {
        orderBy: { timestamp: "desc" },
        take: 100, // Last 100 telemetry events
      },
      investments: true,
    },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Analyze telemetry for anomalies
  const anomalies = analyzeTelemetry(project.telemetry);

  // Build context for AI
  const systemPrompt = `You are an AI monitoring and reporting system for Bosques DAO community projects.
Analyze the project data and generate a comprehensive report in JSON format.

Your report should include:
1. Overall summary of project health
2. Identified anomalies with severity levels
3. Milestone progress assessment
4. Funding status evaluation
5. Actionable recommendations

Be objective, data-driven, and constructive. Focus on helping the community make informed decisions.`;

  const userMessage = `Project: ${project.title}
Status: ${project.status}
Funding: ${project.fundingRaised} / ${project.fundingGoal} BOSQUES

Milestones:
${project.milestones
  .map(
    (m, i) =>
      `${i + 1}. ${m.title} - Status: ${m.status} - ${m.fundingPercentage}% of funding`
  )
  .join("\n")}

Recent Telemetry (${project.telemetry.length} events):
${project.telemetry.slice(0, 10).map((t) => `- ${t.type}: ${JSON.stringify(t.data)}`).join("\n")}

Detected Anomalies:
${anomalies.map((a) => `- ${a.type}: ${a.description}`).join("\n")}

Generate a comprehensive report following this JSON schema:
{
  "title": "Report title",
  "summary": "Brief overall summary",
  "anomalies": [
    {
      "type": "anomaly type",
      "severity": "low|medium|high|critical",
      "description": "description",
      "recommendation": "what to do"
    }
  ],
  "milestoneProgress": [
    {
      "milestoneId": "id",
      "status": "current status",
      "assessment": "assessment text"
    }
  ],
  "fundingStatus": {
    "raised": "amount",
    "goal": "amount",
    "percentComplete": number,
    "assessment": "funding assessment"
  },
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

  try {
    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096"),
      temperature: 0.5,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in Anthropic response");
    }

    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    const report: AIReport = JSON.parse(jsonText);

    logger.info("Successfully generated AI report", {
      projectId,
      anomalies: report.anomalies.length,
      recommendations: report.recommendations.length,
    });

    return report;
  } catch (error: any) {
    logger.error("AI report generation failed", { error: error.message, projectId });

    if (retries > 0 && error.status >= 500) {
      const delay = (4 - retries) * 1000;
      logger.info(`Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return generateReport(projectId, retries - 1);
    }

    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

/**
 * Analyze telemetry data for anomalies
 */
function analyzeTelemetry(telemetry: any[]): any[] {
  const anomalies: any[] = [];
  const thresholds = projectConfig.ai.reporting.anomalyThresholds;

  // Analyze drone telemetry
  const droneTelemetry = telemetry.filter((t) => t.type === "drone");

  if (droneTelemetry.length > 0) {
    const latest = droneTelemetry[0].data;

    // Check uptime
    if (latest.uptimePercent < thresholds.uptimeMinPercent) {
      anomalies.push({
        type: "low_uptime",
        severity: "high",
        description: `Drone uptime is ${latest.uptimePercent}% (threshold: ${thresholds.uptimeMinPercent}%)`,
        recommendation: "Investigate drone connectivity and power issues",
      });
    }

    // Check battery
    if (latest.batteryPercent < thresholds.batteryMinPercent) {
      anomalies.push({
        type: "low_battery",
        severity: latest.batteryPercent < 10 ? "critical" : "high",
        description: `Battery at ${latest.batteryPercent}%`,
        recommendation: "Schedule battery replacement or charging",
      });
    }

    // Check last seen
    if (latest.lastSeenHoursAgo > thresholds.maxHoursSinceLastSeen) {
      anomalies.push({
        type: "device_offline",
        severity: "critical",
        description: `Drone last seen ${latest.lastSeenHoursAgo} hours ago`,
        recommendation: "Investigate why device is offline",
      });
    }

    // Check error codes
    if (latest.errorCodes && latest.errorCodes.length >= thresholds.maxConsecutiveErrors) {
      anomalies.push({
        type: "repeated_errors",
        severity: "medium",
        description: `${latest.errorCodes.length} error codes detected`,
        recommendation: "Review and resolve error codes",
      });
    }
  }

  return anomalies;
}

export type { AIReport };
