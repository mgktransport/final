"use client"

import * as React from "react"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"

// Types
interface User {
  id: string
  email: string
  nom: string
  prenom: string
  role: string
  mustChangePassword?: boolean
}

interface LoginResult {
  success: boolean
  error?: string
  mustChangePassword?: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearMustChangePassword: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = async () => {
    try {
      // First, ensure the admin user exists
      await fetch("/api/auth/setup")
      
      // Then check if we have a session
      const response = await fetch("/api/auth/me")
      const data = await response.json()
      if (data.success && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Erreur vérification auth:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, motDePasse: password }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        return { 
          success: true, 
          mustChangePassword: data.user.mustChangePassword || false 
        }
      }

      return { success: false, error: data.error || "Erreur de connexion" }
    } catch (error) {
      console.error("Erreur login:", error)
      return { success: false, error: "Erreur de connexion au serveur" }
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (error) {
      console.error("Erreur logout:", error)
    } finally {
      setUser(null)
    }
  }

  const clearMustChangePassword = () => {
    if (user) {
      setUser({ ...user, mustChangePassword: false })
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkAuth,
        clearMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
