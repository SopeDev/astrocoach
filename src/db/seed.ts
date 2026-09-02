import { db } from "./client";
import { DEVELOPMENT_USER_EMAIL, DEVELOPMENT_USER_ID } from "../lib/development-user";

async function seed() {
  await db.user.upsert({
    where: { email: DEVELOPMENT_USER_EMAIL },
    create: {
      id: DEVELOPMENT_USER_ID,
      email: DEVELOPMENT_USER_EMAIL,
      displayName: "Development User",
      locale: "en",
      theme: "system",
    },
    update: { displayName: "Development User" },
  });

  console.log(`Seeded development user: ${DEVELOPMENT_USER_EMAIL}`);
  await db.$disconnect();
}

seed().catch(async (error) => {
  console.error("Database seed failed", error);
  await db.$disconnect();
  process.exit(1);
});
