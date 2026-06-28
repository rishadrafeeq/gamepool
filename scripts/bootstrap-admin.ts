#!/usr/bin/env tsx
/**
 * One-time production admin bootstrap.
 * Usage: ADMIN_BOOTSTRAP_SECRET=... pnpm bootstrap:admin admin@example.com 'StrongPassword123!'
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const email = process.argv[2];
  const password = process.argv[3];
  const displayName = process.argv[4] ?? "GamePool Admin";

  if (!secret || secret.length < 32) {
    console.error("ADMIN_BOOTSTRAP_SECRET must be set (min 32 chars)");
    process.exit(1);
  }

  if (!email || !password) {
    console.error("Usage: pnpm bootstrap:admin <email> <password> [displayName]");
    process.exit(1);
  }

  if (password.length < 16) {
    console.error("Password must be at least 16 characters");
    process.exit(1);
  }

  const weak = ["changeme", "change-me", "password", "admin"];
  if (weak.includes(password.toLowerCase())) {
    console.error("Password is too weak for production bootstrap");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash,
      displayName,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    create: {
      email,
      passwordHash,
      displayName,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Admin bootstrapped: ${admin.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
