// Frontend storage helper for file uploads
// Uses the Manus storage proxy with frontend API key

const STORAGE_API_URL = import.meta.env.VITE_FRONTEND_FORGE_API_URL;
const STORAGE_API_KEY = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: ArrayBuffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!STORAGE_API_URL || !STORAGE_API_KEY) {
    throw new Error("Storage configuration missing");
  }

  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(STORAGE_API_URL, key);
  
  const blobData = typeof data === "string" ? data : new Uint8Array(data);
  const blob = new Blob([blobData], { type: contentType });
  
  const formData = new FormData();
  formData.append("file", blob, key.split("/").pop() ?? key);

  const response = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: buildAuthHeaders(STORAGE_API_KEY),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Upload failed: ${message}`);
  }

  const result = await response.json();
  return { key, url: result.url };
}
