const DEV_BOT_TOKEN = "TEST_TOKEN";
const DEV_TELEGRAM_ID = 777_000_123;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

export async function createDevInitData(): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: `DEV-${DEV_TELEGRAM_ID}`,
    user: JSON.stringify({
      id: DEV_TELEGRAM_ID,
      first_name: "Browser",
      username: "browser_dev",
    }),
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), DEV_BOT_TOKEN);
  const signature = await hmac(secret, dataCheckString);
  params.set("hash", toHex(signature));
  return params.toString();
}
