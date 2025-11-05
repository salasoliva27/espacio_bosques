import { PrismaClient } from "@prisma/client";
import { simulateDroneHistory } from "../ai/adapters/drone_simulator";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create users
  console.log("Creating users...");

  const admin = await prisma.user.upsert({
    where: { walletAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" },
    update: {},
    create: {
      walletAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      role: "ADMIN",
      verified: true,
      kycStatus: "APPROVED",
    },
  });

  const validator = await prisma.user.upsert({
    where: { walletAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" },
    update: {},
    create: {
      walletAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      role: "VALIDATOR",
      verified: true,
      kycStatus: "APPROVED",
    },
  });

  const planner = await prisma.user.upsert({
    where: { walletAddress: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc" },
    update: {},
    create: {
      walletAddress: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      role: "PLANNER",
      verified: true,
      kycStatus: "APPROVED",
    },
  });

  const investor = await prisma.user.upsert({
    where: { walletAddress: "0x90f79bf6eb2c4f870365e785982e1f101e93b906" },
    update: {},
    create: {
      walletAddress: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
      role: "MEMBER",
      verified: true,
      kycStatus: "APPROVED",
    },
  });

  console.log("✅ Users created");
  console.log(`  - Admin: ${admin.walletAddress}`);
  console.log(`  - Validator: ${validator.walletAddress}`);
  console.log(`  - Planner: ${planner.walletAddress}`);
  console.log(`  - Investor: ${investor.walletAddress}\n`);

  // Create projects
  console.log("Creating projects...");

  // Project 1: Drone Vigilance (AI-generated, with telemetry)
  const droneProject = await prisma.project.create({
    data: {
      plannerId: planner.id,
      chainId: 31337,
      contractId: 1,
      title: "Bosques Forest Drone Vigilance",
      summary:
        "Deploy an autonomous drone system for 24/7 forest monitoring in the Bosques region. " +
        "The system will detect illegal logging, forest fires, and wildlife activity using AI-powered image recognition. " +
        "Real-time alerts will be sent to local authorities and the community.",
      category: "environment",
      metadataURI: "ipfs://QmDroneProject123",
      fundingGoal: "50000000000000000000000", // 50,000 BOSQUES
      fundingRaised: "30000000000000000000000", // 30,000 BOSQUES
      status: "ACTIVE",
      aiGenerated: true,
      aiBlueprint: {
        title: "Bosques Forest Drone Vigilance",
        category: "environment",
        monitoringHints: [
          "Track drone uptime and battery levels",
          "Monitor image capture frequency",
          "Alert on detection of smoke or unauthorized activity",
          "Ensure GPS coordinates are within designated area",
        ],
      },
      approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  });

  // Milestones for drone project
  await prisma.milestone.createMany({
    data: [
      {
        projectId: droneProject.id,
        contractId: 1,
        chainId: 31337,
        title: "Drone Hardware Procurement",
        description:
          "Purchase industrial-grade drone with thermal camera, high-resolution RGB camera, and LTE connectivity for remote areas.",
        fundingPercentage: 30,
        durationDays: 30,
        status: "COMPLETED",
        completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        projectId: droneProject.id,
        contractId: 2,
        chainId: 31337,
        title: "AI Model Training",
        description:
          "Train machine learning models to detect smoke, unauthorized vehicles, and logging equipment from aerial imagery.",
        fundingPercentage: 25,
        durationDays: 45,
        status: "IN_PROGRESS",
      },
      {
        projectId: droneProject.id,
        contractId: 3,
        chainId: 31337,
        title: "Deploy and Test System",
        description:
          "Deploy drone with charging station, set up monitoring dashboard, and conduct 2-week pilot test with local rangers.",
        fundingPercentage: 25,
        durationDays: 30,
        status: "PENDING",
      },
      {
        projectId: droneProject.id,
        contractId: 4,
        chainId: 31337,
        title: "Community Training & Handover",
        description:
          "Train 10 community members on drone operation, maintenance, and alert response protocols. Create documentation in Spanish.",
        fundingPercentage: 20,
        durationDays: 21,
        status: "PENDING",
      },
    ],
  });

  // Project 2: Community Garden
  const gardenProject = await prisma.project.create({
    data: {
      plannerId: planner.id,
      chainId: 31337,
      contractId: 2,
      title: "Los Bosques Community Organic Garden",
      summary:
        "Establish a 500 m² organic community garden to provide fresh produce for 50 families. " +
        "Includes raised beds, irrigation system, tool shed, and educational workshops on sustainable farming.",
      category: "community",
      metadataURI: "ipfs://QmGardenProject456",
      fundingGoal: "15000000000000000000000", // 15,000 BOSQUES
      fundingRaised: "8000000000000000000000", // 8,000 BOSQUES
      status: "APPROVED",
      aiGenerated: false,
      approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  });

  await prisma.milestone.createMany({
    data: [
      {
        projectId: gardenProject.id,
        contractId: 5,
        chainId: 31337,
        title: "Site Preparation & Infrastructure",
        description:
          "Clear and level land, install fence, build tool shed, and set up water collection system.",
        fundingPercentage: 40,
        durationDays: 30,
        status: "PENDING",
      },
      {
        projectId: gardenProject.id,
        contractId: 6,
        chainId: 31337,
        title: "Garden Setup",
        description:
          "Build 30 raised beds, install drip irrigation, add compost and soil, plant first crops.",
        fundingPercentage: 35,
        durationDays: 21,
        status: "PENDING",
      },
      {
        projectId: gardenProject.id,
        contractId: 7,
        chainId: 31337,
        title: "Community Training",
        description:
          "Conduct 4 weekend workshops on organic gardening, composting, and pest management for participants.",
        fundingPercentage: 25,
        durationDays: 60,
        status: "PENDING",
      },
    ],
  });

  console.log("✅ Projects created");
  console.log(`  - ${droneProject.title} (ID: ${droneProject.id})`);
  console.log(`  - ${gardenProject.title} (ID: ${gardenProject.id})\n`);

  // Create investments
  console.log("Creating investments...");

  await prisma.investment.create({
    data: {
      projectId: droneProject.id,
      investorId: investor.id,
      amount: "20000000000000000000000", // 20,000 BOSQUES
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      chainId: 31337,
    },
  });

  await prisma.investment.create({
    data: {
      projectId: droneProject.id,
      investorId: admin.id,
      amount: "10000000000000000000000", // 10,000 BOSQUES
      txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      chainId: 31337,
    },
  });

  await prisma.investment.create({
    data: {
      projectId: gardenProject.id,
      investorId: investor.id,
      amount: "8000000000000000000000", // 8,000 BOSQUES
      txHash: "0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
      chainId: 31337,
    },
  });

  console.log("✅ Investments created\n");

  // Simulate drone telemetry for drone project
  console.log("Simulating drone telemetry...");
  await simulateDroneHistory(droneProject.id, 30);
  console.log("✅ Drone telemetry simulated (30 events)\n");

  console.log("🎉 Database seeding complete!\n");
  console.log("Summary:");
  console.log("  - 4 users (admin, validator, planner, investor)");
  console.log("  - 2 projects (Drone Vigilance, Community Garden)");
  console.log("  - 7 milestones");
  console.log("  - 3 investments");
  console.log("  - 30 telemetry events");
  console.log("\n✨ Ready to demo!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
