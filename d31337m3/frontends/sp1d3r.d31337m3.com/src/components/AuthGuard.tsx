import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import type { ReactNode } from "react"

interface Props {
  children: ReactNode
  requireAdmin?: boolean
}

export default function AuthGuard({ children, requireAdmin }: Props) {
  const { token } = useAuth()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin) {
    // Admin check would need a profile fetch; for now allow if token exists
  }

  return <>{children}</>
}
