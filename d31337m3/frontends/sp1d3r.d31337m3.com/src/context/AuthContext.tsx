import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { ReactNode } from "react"
import { apiRequest } from "../api/client"

interface User {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  bio: string
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

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>
  register: (data: Record<string, unknown>) => Promise<boolean>
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

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiRequest<{ access_token: string; user_id: string; username: string }>(
      "cityhall",
      "POST",
      "/auth/login",
      { username, password },
    )
    if (res.ok) {
      const { access_token, user_id, username: uname } = res.data
      localStorage.setItem("sp1d3r_token", access_token)
      localStorage.setItem("sp1d3r_user_id", user_id)
      localStorage.setItem("sp1d3r_username", uname)
      setState((prev) => ({
        ...prev,
        token: access_token,
        userId: user_id,
        username: uname,
      }))
      return true
    }
    return false
  }, [])

  const register = useCallback(async (data: Record<string, unknown>) => {
    const res = await apiRequest<{ access_token: string; user_id: string; username: string }>(
      "cityhall",
      "POST",
      "/auth/register",
      data,
    )
    if (res.ok) {
      const { access_token, user_id, username: uname } = res.data
      localStorage.setItem("sp1d3r_token", access_token)
      localStorage.setItem("sp1d3r_user_id", user_id)
      localStorage.setItem("sp1d3r_username", uname)
      setState((prev) => ({
        ...prev,
        token: access_token,
        userId: user_id,
        username: uname,
      }))
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("sp1d3r_token")
    localStorage.removeItem("sp1d3r_user_id")
    localStorage.removeItem("sp1d3r_username")
    localStorage.removeItem("sp1d3r_is_admin")
    setState({ token: null, userId: null, username: null, user: null, isAdmin: false })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
