import { NextRequest } from "next/server";

export function createNextRequest(
  pathname: string,
  searchParams?: Record<string, string>,
): NextRequest {
  const url = new URL(pathname, "http://localhost:3000");
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  return new NextRequest(url);
}
