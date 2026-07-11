const API_BASES = {
  cityhall: import.meta.env.VITE_CITYHALL_URL || "http://localhost:8000",
  director: import.meta.env.VITE_DIRECTOR_URL || "http://localhost:8400",
  historian: import.meta.env.VITE_HISTORIAN_URL || "http://localhost:8100",
  lawyer: import.meta.env.VITE_LAWYER_URL || "http://localhost:8200",
  inboxer: import.meta.env.VITE_INBOXER_URL || "http://localhost:8300",
  picaso: import.meta.env.VITE_PICASO_URL || "http://localhost:8500",
  sp1d3r: import.meta.env.VITE_SP1D3R_URL || "http://localhost:9000",
  spiderwire: import.meta.env.VITE_SPIDERWIRE_URL || "http://localhost:8600",
  banker: import.meta.env.VITE_BANKER_URL || "http://localhost:8700",
}

export type ServiceName = keyof typeof API_BASES

function getToken(): string | null {
  return localStorage.getItem("sp1d3r_token")
}

export async function apiRequest<T = unknown>(
  service: ServiceName,
  method: string,
  path: string,
  body?: object,
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = API_BASES[service]
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  const res = await fetch(`${base.replace(/\/+$/, "")}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data: data as T }
}

export function getApiBase(service: ServiceName): string {
  return API_BASES[service]
}
