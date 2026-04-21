/**
 * Verify TrigGuard receipt: fetch public keys from authority, verify Ed25519 signature over receiptHash.
 * Returns true if signature is valid, false otherwise.
 */
const crypto = require("crypto");

const INVALID_KEY_PATTERNS = ["REPLACE_ME", "REPLACE_WITH"];

async function fetchKeys(authorityUrl, authToken) {
  const base = authorityUrl.replace(/\/$/, "");
  const url = `${base}/.well-known/trigguard/keys.json`;
  const headers = { Accept: "application/json" };
  if (authToken) {
    if (typeof authToken !== "string") {
      throw new Error("authToken must be a string");
    }
    if (/[\r\n]/.test(authToken)) {
      throw new Error("authToken contains invalid characters");
    }
    headers.Authorization = `Bearer ${authToken}`;
  }

  // Bound network time to avoid indefinite hangs when the authority is unresponsive.
  const controller = new AbortController();
  const timeoutMs = 10_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`Keys endpoint ${res.status}: ${await res.text()}`);
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function verifyReceipt(receipt, keys) {
  if (!receipt || !receipt.receiptHash || !receipt.authoritySignature) return false;
  if (receipt.authoritySignature === "unsigned") return false;

  const keyId = receipt.authorityKeyId || "trigguard-cloud-key-1";
  const key = keys.keys && keys.keys.find((k) => k.keyId === keyId);
  if (!key || !key.publicKeyPem) return false;
  if (INVALID_KEY_PATTERNS.some((pattern) => key.publicKeyPem.includes(pattern))) return false;

  let publicKey;
  try {
    publicKey = crypto.createPublicKey({
      key: key.publicKeyPem,
      format: "pem",
      type: "spki",
    });
  } catch {
    return false;
  }

  // Ed25519 one-shot verify: the key type (Ed25519) determines the algorithm; the first
  // parameter is intentionally undefined so no hash algorithm is requested.
  return crypto.verify(
    undefined,
    Buffer.from(receipt.receiptHash, "hex"),
    publicKey,
    Buffer.from(receipt.authoritySignature, "base64")
  );
}

async function verifyReceiptWithAuthority(receipt, authorityUrl, authToken) {
  const keys = await fetchKeys(authorityUrl, authToken);
  return verifyReceipt(receipt, keys);
}

module.exports = { verifyReceipt, verifyReceiptWithAuthority, fetchKeys };
