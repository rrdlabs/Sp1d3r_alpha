const API_PREFIXES: Record<string, string> = {
  cityhall: "/cityhall",
  director: "/director",
  historian: "/historian",
  lawyer: "/lawyer",
  inboxer: "/inboxer",
  picaso: "/picaso",
  spiderwire: "/spiderwire",
  banker: "/banker",
  sp1d3r: "/sp1d3r",
}

export type ServiceName = keyof typeof API_PREFIXES

function getToken(): string | null {
  return localStorage.getItem("sp1d3r_token")
}

export async function apiRequest<T = unknown>(
  service: ServiceName,
  method: string,
  path: string,
  body?: object,
  extraHeaders?: Record<string, string>,
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = API_PREFIXES[service]
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = getToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  if (extraHeaders) {
    Object.assign(headers, extraHeaders)
  }
  const url = `${base}${path}`
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data: data as T }
}

export function getApiBase(service: ServiceName): string {
  return API_PREFIXES[service]
}
