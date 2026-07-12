import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { ReactNode } from "react"
import { apiRequest } from "../api/client"

function getDeviceId(): string {
  let id = localStorage.getItem("sp1d3r_device_id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("sp1d3r_device_id", id)
  }
  return id
}

export { getDeviceId }

interface User {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  bio: string
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  country: string | null
  ssn_last4: string | null
  is_nodeop: boolean
  is_tech_op: boolean
  is_chat_op: boolean
  wallet_address: string | null
  signup_date: string
}

interface AuthState {
  token: string | null
  userId: string | null
  username: string | null
  user: User | null
  isAdmin: boolean
}

export interface OTPPending {
  requires_otp: true
  user_id: string
  username: string
  purpose: string
  email_hint: string
}

type AuthResult = { ok: true } | { ok: false } | { ok: false; otp: OTPPending }

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<AuthResult>
  register: (data: Record<string, unknown>) => Promise<AuthResult>
  completeAuth: (data: { access_token: string; user_id: string; username: string; is_admin: boolean }) => void
  logout: () => void
  fetchProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    token: localStorage.getItem("sp1d3r_token"),
    userId: localStorage.getItem("sp1d3r_user_id"),
    username: localStorage.getItem("sp1d3r_username"),
    user: null,
    isAdmin: localStorage.getItem("sp1d3r_is_admin") === "true",
  }))

  const fetchProfile = useCallback(async () => {
    if (!state.token) return
    const res = await apiRequest<User>("cityhall", "GET", "/users/me")
    if (res.ok) {
      setState((prev) => ({ ...prev, user: res.data }))
    }
  }, [state.token])

  useEffect(() => {
    if (state.token) fetchProfile()
  }, [state.token, fetchProfile])

  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    const deviceId = getDeviceId()
    const res = await apiRequest<{ access_token: string; user_id: string; username: string; is_admin: boolean } & { requires_otp?: boolean; purpose?: string; email_hint?: string }>(
      "cityhall",
      "POST",
      "/auth/login",
      { username, password },
      { "X-Device-ID": deviceId },
    )
    if (res.ok) {
      if (res.data.requires_otp) {
        return { ok: false, otp: { requires_otp: true, user_id: res.data.user_id, username: res.data.username, purpose: res.data.purpose!, email_hint: res.data.email_hint! } }
      }
      const { access_token, user_id, username: uname, is_admin } = res.data
      localStorage.setItem("sp1d3r_token", access_token)
      localStorage.setItem("sp1d3r_user_id", user_id)
      localStorage.setItem("sp1d3r_username", uname)
      localStorage.setItem("sp1d3r_is_admin", String(is_admin))
      setState((prev) => ({
        ...prev,
        token: access_token,
        userId: user_id,
        username: uname,
        isAdmin: is_admin,
      }))
      return { ok: true }
    }
    return { ok: false }
  }, [])

  const register = useCallback(async (data: Record<string, unknown>): Promise<AuthResult> => {
    const res = await apiRequest<{ access_token: string; user_id: string; username: string; is_admin: boolean } & { requires_otp?: boolean; purpose?: string; email_hint?: string }>(
      "cityhall",
      "POST",
      "/auth/register",
      data,
    )
    if (res.ok) {
      if (res.data.requires_otp) {
        return { ok: false, otp: { requires_otp: true, user_id: res.data.user_id, username: res.data.username, purpose: res.data.purpose!, email_hint: res.data.email_hint! } }
      }
      const { access_token, user_id, username: uname, is_admin } = res.data
      localStorage.setItem("sp1d3r_token", access_token)
      localStorage.setItem("sp1d3r_user_id", user_id)
      localStorage.setItem("sp1d3r_username", uname)
      localStorage.setItem("sp1d3r_is_admin", String(is_admin))
      setState((prev) => ({
        ...prev,
        token: access_token,
        userId: user_id,
        username: uname,
        isAdmin: is_admin,
      }))
      return { ok: true }
    }
    return { ok: false }
  }, [])

  const completeAuth = useCallback((data: { access_token: string; user_id: string; username: string; is_admin: boolean }) => {
    localStorage.setItem("sp1d3r_token", data.access_token)
    localStorage.setItem("sp1d3r_user_id", data.user_id)
    localStorage.setItem("sp1d3r_username", data.username)
    localStorage.setItem("sp1d3r_is_admin", String(data.is_admin))
    setState((prev) => ({
      ...prev,
      token: data.access_token,
      userId: data.user_id,
      username: data.username,
      isAdmin: data.is_admin,
    }))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("sp1d3r_token")
    localStorage.removeItem("sp1d3r_user_id")
    localStorage.removeItem("sp1d3r_username")
    localStorage.removeItem("sp1d3r_is_admin")
    setState({ token: null, userId: null, username: null, user: null, isAdmin: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, completeAuth, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
