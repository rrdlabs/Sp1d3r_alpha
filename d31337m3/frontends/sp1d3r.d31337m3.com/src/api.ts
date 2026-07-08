const DEFAULTS = {
  baseUrl: "http://localhost:8080",
  authToken: "",
}

function storageKey(key: string): string {
  return `sp1d3r_panel_${key}`
}

function load(key: string): string {
  return localStorage.getItem(storageKey(key)) ?? ""
}

function save(key: string, value: string): void {
  localStorage.setItem(storageKey(key), value)
}

export function loadBaseUrl(): string {
  return load("baseUrl") || DEFAULTS.baseUrl
}

export function saveBaseUrl(url: string): void {
  save("baseUrl", url)
}

export function loadAuthToken(): string {
  return load("authToken")
}

export function saveAuthToken(token: string): void {
  save("authToken", token)
}

async function request(
  baseUrl: string,
  method: string,
  path: string,
  body?: object,
  authToken?: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`
  }
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

export interface HealthResponse {
  status: string
}

export async function checkHealth(
  baseUrl: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  return request(baseUrl, "GET", "/health")
}

export interface CrawlRequest {
  urls: string[]
  recipient_public_key: string
}

export async function submitCrawl(
  baseUrl: string,
  urls: string[],
  recipientPublicKey: string,
  authToken: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  return request(baseUrl, "POST", "/v1/crawl", {
    urls,
    recipient_public_key: recipientPublicKey,
  }, authToken)
}
