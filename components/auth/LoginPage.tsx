"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plane } from "lucide-react"
import { createClient } from "@/lib/supabase"
import type { User } from "@/types/traveler"

interface LoginPageProps {
  setUser: (user: User) => void
}

export function LoginPage({ setUser }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    const supabase = createClient()

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else if (data.user) {
        const role = email.includes("admin") ? "admin" : "employee"
        const { error: roleError } = await supabase.from("user_roles").insert({ user_id: data.user.id, role })
        if (roleError) {
          console.error("Error inserting user role:", roleError)
          setMessage("Registration successful, but failed to assign role. Please contact support.")
        } else {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
          if (signInError) {
            setMessage(signInError.message)
          } else if (signInData.user) {
            const { data: roleData, error: fetchRoleError } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", signInData.user.id)
              .single()
            if (fetchRoleError) {
              console.error("Error fetching user role after signup login:", fetchRoleError)
              setUser({ id: signInData.user.id, email: signInData.user.email!, role: "employee" })
            } else {
              setUser({ id: signInData.user.id, email: signInData.user.email!, role: roleData.role })
            }
            setMessage("")
          }
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
      } else if (data.user) {
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single()
        if (roleError) {
          console.error("Error fetching user role:", roleError)
          setMessage("Login successful, but failed to fetch role. Please contact support.")
          setUser({ id: data.user.id, email: data.user.email!, role: "employee" })
        } else {
          setUser({ id: data.user.id, email: data.user.email!, role: roleData.role })
          setMessage("")
        }
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20"></div>
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg">
              <Plane className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Safeguard Management
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 mt-2">
            {isRegistering ? "Create your account" : "Welcome back! Sign in to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@demo.com or employee@demo.com"
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo123"
                className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                required
                minLength={6}
              />
            </div>
            {message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{message}</div>
            )}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setMessage("")
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isRegistering ? "Already have an account? Sign in" : "Need an account? Register here"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
