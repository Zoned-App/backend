import { GameJoinSchema } from "@buf/zoned_protos.bufbuild_es/zoned/v1/game_join_pb.js";
import { GameStatus } from "@buf/zoned_protos.bufbuild_es/zoned/v1/game_status_pb.js";
import { GameZoneSchema } from "@buf/zoned_protos.bufbuild_es/zoned/v1/game_zone_pb.js";
import { create, toBinary } from "@bufbuild/protobuf";
import { handleAuth } from "./routes/auth.ts";

const jsonHeaders = new Headers({ "content-type": "application/json" });

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function handleWebSocket(request: Request): Response {
  const { socket, response } = Deno.upgradeWebSocket(request);

  socket.onopen = () => {
    const gameZone = create(GameZoneSchema, {
      centerLat: 0.34,
      centerLon: 2.43,
      radiusMeters: 200,
    });

    const message = create(GameJoinSchema, {
      status: GameStatus.Lobby,
      players: ["test", "hfdhjkd"],
      zone: gameZone,
    });

    socket.send(toBinary(GameJoinSchema, message));
  };

  socket.onmessage = (event) => {
    console.log("WebSocket message received:", event.data);
  };

  socket.onerror = (event) => {
    console.error("WebSocket error:", event);
  };

  return response;
}

function parseDotEnv(text: string) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=", 2))
      .filter((pair): pair is [string, string] => pair.length === 2)
      .map(([key, value]) => [key, value.replace(/(^"|"$)/g, "")]),
  );
}

async function loadDotEnv() {
  try {
    const raw = await Deno.readTextFile(".env");
    const values = parseDotEnv(raw);
    for (const [key, value] of Object.entries(values)) {
      if (Deno.env.get(key) === undefined) {
        Deno.env.set(key, value);
      }
    }
  } catch {
    // No .env file present or cannot read it.
  }
}

export function add(a: number, b: number) {
  return a + b;
}

await loadDotEnv();

const PORT = Number(Deno.env.get("PORT") ?? 3000);

console.log(`Zoned backend running on http://localhost:${PORT}`);

Deno.serve({ port: PORT }, async (request) => {
  try {
    const url = new URL(request.url);

    if (
      request.headers.get("upgrade")?.toLowerCase() === "websocket" &&
      (url.pathname === "/" || url.pathname === "/ws")
    ) {
      return handleWebSocket(request);
    }

    if (url.pathname.startsWith("/auth")) {
      return await handleAuth(request, url);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse({ status: "ok" });
    }

    return jsonResponse({ error: "Route not found" }, 404);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
