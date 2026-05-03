import bcrypt from "bcryptjs";
import { createUser, findByEmail, findById, User } from "../db/users.ts";
import { requireAuth } from "../middleware/requireAuth.ts";
import { signJwt } from "../lib/jwt.ts";

const JWT_EXPIRES_IN_SECONDS = Number(Deno.env.get("JWT_EXPIRES_IN")) ||
  7 * 24 * 60 * 60;

function safeUser(user: User) {
  const { ...rest } = user;
  return rest;
}

async function signToken(user: User) {
  return await signJwt({
    id: user.id,
    username: user.username,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS,
  });
}

const jsonHeaders = new Headers({ "content-type": "application/json" });

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

export async function handleAuth(
  request: Request,
  url: URL,
): Promise<Response> {
  if (url.pathname === "/auth/signup" && request.method === "POST") {
    let payload: Record<string, unknown> | null = null;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const username = typeof payload?.username === "string"
      ? payload.username.trim()
      : "";
    const email = typeof payload?.email === "string"
      ? payload.email.trim()
      : "";
    const password = typeof payload?.password === "string"
      ? payload.password
      : "";

    if (!username) {
      return jsonResponse({ error: "Username is required" }, 400);
    }
    if (!email) {
      return jsonResponse({ error: "Email is required" }, 400);
    }
    if (!password || password.length < 6) {
      return jsonResponse(
        { error: "Password must be at least 6 characters" },
        400,
      );
    }

    if (findByEmail(email)) {
      return jsonResponse({
        error: "An account with that email already exists",
      }, 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = createUser({ username, email, passwordHash });
    const token = await signToken(user);

    return jsonResponse({ token, user: safeUser(user) }, 201);
  }

  if (url.pathname === "/auth/login" && request.method === "POST") {
    let payload: Record<string, unknown> | null = null;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const email = typeof payload?.email === "string"
      ? payload.email.trim()
      : "";
    const password = typeof payload?.password === "string"
      ? payload.password
      : "";

    if (!email || !password) {
      return jsonResponse({ error: "Email and password are required" }, 400);
    }

    const user = findByEmail(email);
    if (!user) {
      return jsonResponse({ error: "Invalid email or password" }, 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return jsonResponse({ error: "Invalid email or password" }, 401);
    }

    const token = await signToken(user);
    return jsonResponse({ token, user: safeUser(user) });
  }

  if (url.pathname === "/auth/me" && request.method === "GET") {
    try {
      const authPayload = await requireAuth(request);
      const id = typeof authPayload.id === "number"
        ? authPayload.id
        : Number(authPayload.id);

      if (!id) {
        return jsonResponse({ error: "Invalid token payload" }, 401);
      }

      const user = findById(id);
      if (!user) {
        return jsonResponse({ error: "User not found" }, 404);
      }

      return jsonResponse({ user: safeUser(user) });
    } catch (error) {
      return jsonResponse({
        error: error instanceof Error ? error.message : "Unauthorized",
      }, 401);
    }
  }

  return jsonResponse({ error: "Route not found" }, 404);
}
