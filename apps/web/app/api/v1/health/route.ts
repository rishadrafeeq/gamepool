import { NextResponse } from "next/server";

import { success } from "@gamepool/shared";

export async function GET() {
  return NextResponse.json(
    success({
      status: "ok",
      service: "gamepool-api",
      version: "v1",
      timestamp: new Date().toISOString(),
    }),
  );
}
