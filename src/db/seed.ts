import { db } from "./client";

const DEVELOPMENT_USER_ID = "00000000-0000-4000-8000-000000000001";

async function seed() {
  await db.user.upsert({
    where: { email: "dev@astrocoach.local" },
    create: {
      id: DEVELOPMENT_USER_ID,
      email: "dev@astrocoach.local",
      displayName: "Development User",
      locale: "en",
      theme: "system",
    },
    update: { displayName: "Development User" },
  });

  console.log("Seeded development user: dev@astrocoach.local");
  await db.$disconnect();
}

seed().catch(async (error) => {
  console.error("Database seed failed", error);
  await db.$disconnect();
  process.exit(1);
});
