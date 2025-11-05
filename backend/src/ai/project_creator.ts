import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";
import projectConfig from "../../../config/project-config.json";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

interface AIProjectBlueprint {
  title: string;
  summary: string;
  category: "infrastructure" | "environment" | "community" | "technology" | "education";
  milestones: {
    title: string;
    description: string;
    fundingPercentage: number;
    durationDays: number;
  }[];
  monitoringHints: string[];
}

/**
 * Use Anthropic Claude to generate a project blueprint from a user prompt
 */
export async function createProjectWithAI(
  userPrompt: string,
  retries = 3
): Promise<AIProjectBlueprint> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Please add your API key to .env file. " +
      "Get your key from https://console.anthropic.com/"
    );
  }

  const maxPromptLength = projectConfig.ai.projectCreation.maxPromptLength;
  if (userPrompt.length > maxPromptLength) {
    throw new Error(`Prompt too long. Maximum ${maxPromptLength} characters allowed.`);
  }

  const systemPrompt = `You are an expert community project planner for Bosques DAO, a decentralized funding platform.
Your task is to transform user ideas into structured project blueprints.

Generate a JSON response following this exact schema:
{
  "title": "string (max 100 chars)",
  "summary": "string (max 1000 chars)",
  "category": "one of: infrastructure, environment, community, technology, education",
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "fundingPercentage": number (1-100, must sum to 100),
      "durationDays": number (7-180)
    }
  ],
  "monitoringHints": ["string array with monitoring suggestions"]
}

Requirements:
- Create 2-5 milestones that logically break down the project
- Milestones must sum to 100% funding
- Be specific and actionable
- Consider verification and monitoring needs`;

  const userMessage = `User project idea: ${userPrompt}

Please create a structured project blueprint for this idea.`;

  try {
    logger.info("Calling Anthropic API for project creation...");

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022",
      max_tokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096"),
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Extract text content
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in Anthropic response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    const blueprint: AIProjectBlueprint = JSON.parse(jsonText);

    // Validate blueprint
    validateBlueprint(blueprint);

    logger.info("Successfully created project blueprint with AI", {
      title: blueprint.title,
      milestones: blueprint.milestones.length,
    });

    return blueprint;
  } catch (error: any) {
    logger.error("AI project creation failed", { error: error.message });

    // Retry logic with exponential backoff
    if (retries > 0 && error.status >= 500) {
      const delay = (4 - retries) * 1000; // 1s, 2s, 3s
      logger.info(`Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return createProjectWithAI(userPrompt, retries - 1);
    }

    throw new Error(`Failed to generate project blueprint: ${error.message}`);
  }
}

/**
 * Validate AI-generated blueprint against schema
 */
function validateBlueprint(blueprint: any): void {
  const schema = projectConfig.ai.projectCreation.outputSchema;

  if (!blueprint.title || blueprint.title.length > 100) {
    throw new Error("Invalid title");
  }

  if (!blueprint.summary || blueprint.summary.length > 1000) {
    throw new Error("Invalid summary");
  }

  if (!schema.properties.category.enum.includes(blueprint.category)) {
    throw new Error("Invalid category");
  }

  if (
    !Array.isArray(blueprint.milestones) ||
    blueprint.milestones.length < 1 ||
    blueprint.milestones.length > 10
  ) {
    throw new Error("Invalid milestones array");
  }

  // Validate milestones sum to 100%
  const totalPercentage = blueprint.milestones.reduce(
    (sum: number, m: any) => sum + m.fundingPercentage,
    0
  );
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Milestone percentages must sum to 100% (got ${totalPercentage}%)`);
  }

  // Validate each milestone
  blueprint.milestones.forEach((m: any, i: number) => {
    if (!m.title || !m.description) {
      throw new Error(`Milestone ${i + 1} missing title or description`);
    }
    if (m.fundingPercentage < 1 || m.fundingPercentage > 100) {
      throw new Error(`Milestone ${i + 1} invalid funding percentage`);
    }
    if (m.durationDays < 7 || m.durationDays > 180) {
      throw new Error(`Milestone ${i + 1} invalid duration`);
    }
  });

  if (!Array.isArray(blueprint.monitoringHints)) {
    throw new Error("Invalid monitoringHints");
  }
}

export type { AIProjectBlueprint };
