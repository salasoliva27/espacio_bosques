import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";
import projectConfig from "../../../config/project-config.json";
import { queryKnowledge, formatKnowledgeContext } from "../knowledge/base";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

interface AIProjectBlueprint {
  title: string;
  summary: string;
  category: "infrastructure" | "environment" | "community" | "technology" | "education";
  estimatedBudgetMXN: number;
  budgetJustification: string;
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

  const systemPrompt = `You are an expert community project planner for Espacio Bosques — a blockchain-based community funding platform for residents of Bosques de las Lomas, an upscale residential neighborhood in Mexico City (CDMX).

IMPORTANT CONTEXT:
- "Bosques" refers to Bosques de las Lomas, a colonia in CDMX — NOT a forest or natural area
- Projects are funded by and benefit the residents of this specific neighborhood
- Typical projects: street lighting upgrades, security systems, pocket parks, smart traffic calming, pedestrian improvements, cultural events, building restoration, colonia-wide services
- The neighborhood is affluent and well-connected; proposals should match that context
- Projects are written in English but may include Spanish street/place names (e.g., Paseo de las Palmas, Presa Angostura, Explanada de las Palmas, Bosques de las Lomas)
- The BOSQUES token is the neighborhood's governance token, not related to forestry

Your task is to transform user ideas into structured project blueprints that make sense for this specific urban neighborhood.

Generate a JSON response following this exact schema:
{
  "title": "string (max 100 chars, in English)",
  "summary": "string (max 1000 chars, in English, specific to the Bosques de las Lomas neighborhood)",
  "category": "one of: infrastructure, environment, community, technology, education",
  "estimatedBudgetMXN": number (total project budget in Mexican pesos — realistic for the scope),
  "budgetJustification": "string (1-2 sentences explaining the budget estimate with comparable references)",
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "fundingPercentage": number (1-100, must sum to 100),
      "durationDays": number (7-180)
    }
  ],
  "monitoringHints": ["string array with monitoring/verification suggestions relevant to urban infrastructure in CDMX"]
}

Requirements:
- Create 2-5 milestones that logically break down the project
- Milestones must sum to 100% funding
- Be specific and actionable — name real streets, intersections, or landmarks in Bosques de las Lomas where relevant
- Consider CDMX municipal permits, local regulations, and community approval steps
- Never reference forests, wildfires, or natural wilderness

Budget estimation guidelines:
- infrastructure: MXN 50,000–500,000 (lighting, street repair, security cameras)
- community: MXN 10,000–150,000 (events, signage, small improvements)
- environment: MXN 15,000–200,000 (landscaping, tree planting, irrigation)
- technology: MXN 20,000–300,000 (smart sensors, apps, connectivity)
- education: MXN 10,000–100,000 (workshops, materials, programs)
Always justify with a reference: "Similar CCTV installations in CDMX colonias cost ~MXN 8,000–15,000 per camera including cabling."`;

  // Inject relevant knowledge from the shared database
  const relevantKnowledge = queryKnowledge(userPrompt);
  const knowledgeContext = formatKnowledgeContext(relevantKnowledge);

  const userMessage = `User project idea: ${userPrompt}${knowledgeContext}

Please create a structured project blueprint for this idea, informed by the knowledge base above.`;

  try {
    logger.info("Calling Anthropic API for project creation...");

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
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

  if (typeof blueprint.estimatedBudgetMXN !== "number" || blueprint.estimatedBudgetMXN <= 0) {
    throw new Error("Invalid estimatedBudgetMXN");
  }

  if (!blueprint.budgetJustification || typeof blueprint.budgetJustification !== "string") {
    throw new Error("Invalid budgetJustification");
  }

  if (!Array.isArray(blueprint.monitoringHints)) {
    throw new Error("Invalid monitoringHints");
  }
}

export type { AIProjectBlueprint };
