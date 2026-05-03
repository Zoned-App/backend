const encoder = new TextEncoder();
const decoder = new TextDecoder();
let jwtKey: CryptoKey | null = null;

async function getJwtKey(): Promise<CryptoKey> {
  if (jwtKey) return jwtKey;

  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  jwtKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  return jwtKey;
}

function base64UrlEncode(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.padEnd(value.length + ((4 - value.length % 4) % 4), "=")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

export async function signJwt(
  payload: Record<string, unknown>,
): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const data = `${header}.${body}`;

  const signature = await crypto.subtle.sign(
    "HMAC",
    await getJwtKey(),
    encoder.encode(data),
  );

  return `${data}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyJwt(
  token: string,
): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;
  const signatureBytes = base64UrlDecode(signature);

  const valid = await crypto.subtle.verify(
    "HMAC",
    await getJwtKey(),
    signatureBytes,
    encoder.encode(data),
  );

  if (!valid) {
    throw new Error("Invalid token signature");
  }

  const decodedPayload = JSON.parse(
    decoder.decode(base64UrlDecode(payload)),
  ) as Record<string, unknown>;
  const exp = decodedPayload.exp;
  if (typeof exp === "number" && Date.now() / 1000 > exp) {
    throw new Error("Token expired");
  }

  return decodedPayload;
}
