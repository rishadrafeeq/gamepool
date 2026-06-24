import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SPORTS = [
  {
    slug: "football",
    name: "Football",
    sortOrder: 1,
    iconUrl: "/icons/football.svg",
    color: "#16A34A",
  },
  {
    slug: "cricket",
    name: "Cricket",
    sortOrder: 2,
    iconUrl: "/icons/cricket.svg",
    color: "#2563EB",
  },
  {
    slug: "badminton",
    name: "Badminton",
    sortOrder: 3,
    iconUrl: "/icons/badminton.svg",
    color: "#DC2626",
  },
] as const;

async function seedSports() {
  for (const sport of SPORTS) {
    await prisma.sport.upsert({
      where: { slug: sport.slug },
      update: {
        name: sport.name,
        sortOrder: sport.sortOrder,
        iconUrl: sport.iconUrl,
        color: sport.color,
        isActive: true,
      },
      create: {
        slug: sport.slug,
        name: sport.name,
        sortOrder: sport.sortOrder,
        iconUrl: sport.iconUrl,
        color: sport.color,
        isActive: true,
      },
    });
  }
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("Skipping admin seed (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set)");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash,
      displayName: "GamePool Admin",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    create: {
      email,
      passwordHash,
      displayName: "GamePool Admin",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });
}

async function main() {
  console.log("Seeding database...");
  await seedSports();
  await seedAdmin();
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
