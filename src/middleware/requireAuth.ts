import { verifyJwt } from "../lib/jwt.ts";

export async function requireAuth(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyJwt(token);
    return payload;
  } catch {
    throw new Error("Token expired or invalid");
  }
}
