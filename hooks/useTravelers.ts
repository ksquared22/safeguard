"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import type { Traveler, Person, User } from "@/types/traveler"
import { processTravelerData } from "@/utils/travelerUtils"

export function useTravelers() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [arrivalTravelers, setArrivalTravelers] = useState<Traveler[]>([])
  const [departureTravelers, setDepartureTravelers] = useState<Traveler[]>([])
  const [uniquePersons, setUniquePersons] = useState<Person[]>([])
  const [error, setError] = useState<string | null>(null)

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err)
      setError(err instanceof Error ? err.message : "Failed to connect to database")
      return null
    }
  }, [])

  const fetchTravelers = useCallback(async () => {
    if (!supabase) {
      setError("Database connection not available")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.from("travelers").select("*")
      if (error) {
        console.error("Error fetching travelers:", error)
        setError(`Database error: ${error.message}`)
        setArrivalTravelers([])
        setDepartureTravelers([])
        setUniquePersons([])
      } else {
        const processed = processTravelerData(data as Traveler[])
        setArrivalTravelers(processed.arrivals)
        setDepartureTravelers(processed.departures)
        setUniquePersons(processed.uniquePersons)
      }
    } catch (err) {
      console.error("Network error fetching travelers:", err)
      setError("Network error: Unable to connect to database")
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const loadUserAndData = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Error getting session:", sessionError)
          setError(`Authentication error: ${sessionError.message}`)
          setLoading(false)
          return
        }

        if (session?.user) {
          const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .single()

          if (roleError) {
            console.error("Error fetching user role:", roleError)
            setUser({ id: session.user.id, email: session.user.email!, role: "employee" })
          } else {
            setUser({ id: session.user.id, email: session.user.email!, role: roleData.role })
          }
        } else {
          setUser(null)
        }

        await fetchTravelers()
      } catch (err) {
        console.error("Error in loadUserAndData:", err)
        setError("Failed to load user data and travelers")
        setLoading(false)
      }
    }

    loadUserAndData()

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (_event === "SIGNED_OUT") {
          setUser(null)
          setArrivalTravelers([])
          setDepartureTravelers([])
          setUniquePersons([])
          window.location.href = "/"
        } else if (session?.user) {
          const refetch = async () => {
            try {
              const { data: roleData, error: roleError } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", session.user.id)
                .single()

              if (roleError) {
                console.error("Error fetching user role on auth change:", roleError)
                setUser({ id: session.user.id, email: session.user.email!, role: "employee" })
              } else {
                setUser({ id: session.user.id, email: session.user.email!, role: roleData.role })
              }
              await fetchTravelers()
            } catch (err) {
              console.error("Error in auth state change handler:", err)
              setError("Failed to refresh user data")
            }
          }
          refetch()
        } else {
          setUser(null)
          setArrivalTravelers([])
          setDepartureTravelers([])
          setUniquePersons([])
        }
      })

      return () => authListener?.unsubscribe()
    }
  }, [supabase, fetchTravelers])

  return {
    user,
    setUser,
    loading,
    error,
    arrivalTravelers,
    setArrivalTravelers,
    departureTravelers,
    setDepartureTravelers,
    uniquePersons,
    setUniquePersons,
    fetchTravelers,
    supabase,
  }
}
