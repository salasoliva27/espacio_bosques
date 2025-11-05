import { prisma } from "../../index";
import { logger } from "../../utils/logger";
import projectConfig from "../../../../config/project-config.json";

interface DroneTelemetry {
  deviceId: string;
  uptimePercent: number;
  batteryPercent: number;
  lastSeenHoursAgo: number;
  errorCodes: string[];
  location: {
    lat: number;
    lng: number;
  };
  flightTimeHours: number;
  imagesCaptured: number;
  timestamp: string;
}

/**
 * Simulate drone telemetry for a project
 */
export async function simulateDroneTelemetry(projectId: string): Promise<DroneTelemetry> {
  logger.info(`Simulating drone telemetry for project ${projectId}`);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Get simulation defaults from config
  const defaults = projectConfig.simulation.droneDefaults;

  // Generate realistic telemetry with some randomness
  const baseUptime = defaults.uptimePercent;
  const baseBattery = defaults.batteryPercent;
  const errorRate = defaults.errorRate;

  // Add random variation (-5% to +5%)
  const uptimeVariation = (Math.random() - 0.5) * 10;
  const batteryDrain = Math.random() * 30; // Random battery drain 0-30%

  const telemetry: DroneTelemetry = {
    deviceId: `drone-${projectId.substring(0, 8)}`,
    uptimePercent: Math.max(0, Math.min(100, baseUptime + uptimeVariation)),
    batteryPercent: Math.max(0, Math.min(100, baseBattery - batteryDrain)),
    lastSeenHoursAgo: Math.random() * 12, // 0-12 hours ago
    errorCodes: generateErrorCodes(errorRate),
    location: {
      lat: 19.4326 + (Math.random() - 0.5) * 0.1, // Mexico City area
      lng: -99.1332 + (Math.random() - 0.5) * 0.1,
    },
    flightTimeHours: Math.random() * 8, // 0-8 hours flight time
    imagesCaptured: Math.floor(Math.random() * 500), // 0-500 images
    timestamp: new Date().toISOString(),
  };

  // Store telemetry in database
  await prisma.telemetry.create({
    data: {
      projectId,
      type: "drone",
      data: telemetry,
    },
  });

  logger.info("Drone telemetry simulated and stored", {
    projectId,
    deviceId: telemetry.deviceId,
    uptime: telemetry.uptimePercent,
    battery: telemetry.batteryPercent,
  });

  return telemetry;
}

/**
 * Generate random error codes based on error rate
 */
function generateErrorCodes(errorRate: number): string[] {
  const errorCodes: string[] = [];
  const possibleErrors = [
    "GPS_SIGNAL_WEAK",
    "BATTERY_CALIBRATION_NEEDED",
    "CAMERA_FOCUS_ERROR",
    "WIND_SPEED_WARNING",
    "TEMPERATURE_HIGH",
    "MEMORY_ALMOST_FULL",
  ];

  // Generate errors based on error rate
  for (const errorCode of possibleErrors) {
    if (Math.random() < errorRate) {
      errorCodes.push(errorCode);
    }
  }

  return errorCodes;
}

/**
 * Simulate multiple telemetry events over time
 */
export async function simulateDroneHistory(
  projectId: string,
  eventCount: number = 20
): Promise<void> {
  logger.info(`Simulating ${eventCount} historical drone events for project ${projectId}`);

  const now = new Date();
  const interval = 3600000; // 1 hour in milliseconds

  for (let i = 0; i < eventCount; i++) {
    const timestamp = new Date(now.getTime() - (eventCount - i) * interval);

    // Generate telemetry that shows realistic progression
    const batteryDecay = (i / eventCount) * 40; // Battery drains over time
    const uptimeTrend = 95 + Math.random() * 5; // Uptime stays high

    const telemetry: DroneTelemetry = {
      deviceId: `drone-${projectId.substring(0, 8)}`,
      uptimePercent: Math.max(85, uptimeTrend),
      batteryPercent: Math.max(10, 100 - batteryDecay - Math.random() * 10),
      lastSeenHoursAgo: Math.random() * 2,
      errorCodes: generateErrorCodes(0.05 * (1 + i / eventCount)), // Errors increase over time
      location: {
        lat: 19.4326 + (Math.random() - 0.5) * 0.05,
        lng: -99.1332 + (Math.random() - 0.5) * 0.05,
      },
      flightTimeHours: Math.random() * 6,
      imagesCaptured: Math.floor(Math.random() * 300 + i * 10), // Images accumulate
      timestamp: timestamp.toISOString(),
    };

    await prisma.telemetry.create({
      data: {
        projectId,
        type: "drone",
        data: telemetry,
        timestamp,
      },
    });
  }

  logger.info(`Successfully simulated ${eventCount} telemetry events`);
}

export type { DroneTelemetry };
