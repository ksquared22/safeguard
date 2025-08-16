"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase"
import type { Traveler, Person, User } from "@/types/traveler"
import { processTravelerData } from "@/utils/travelerUtils"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

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

  const patchLocal = useCallback((id: string, patch: Partial<Traveler>) => {
    setArrivalTravelers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as Traveler : t)))
    setDepartureTravelers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } as Traveler : t)))
    setUniquePersons((prev) =>
      prev.map((p) => ({
        ...p,
        arrivalSegments: p.arrivalSegments.map((t) => (t.id === id ? { ...t, ...patch } as Traveler : t)),
        departureSegments: p.departureSegments.map((t) => (t.id === id ? { ...t, ...patch } as Traveler : t)),
        isAnySegmentCheckedIn:
          p.arrivalSegments.some((t) => t.id === id ? (patch.checked_in ?? t.checked_in) || (patch.checked_out ?? t.checked_out) : t.checked_in || t.checked_out) ||
          p.departureSegments.some((t) => t.id === id ? (patch.checked_in ?? t.checked_in) || (patch.checked_out ?? t.checked_out) : t.checked_in || t.checked_out),
      }))
    )
  }, [])

  const updateTraveler = useCallback(
    async (id: string, patch: Partial<Traveler>) => {
      if (!supabase) throw new Error("Supabase not initialized")
      // optimistic UI
      patchLocal(id, patch)
      const { error } = await supabase.from("travelers").update(patch).eq("id", id)
      if (error) {
        console.error("Update failed, reverting:", error)
        // refetch to ensure consistency if update fails
        await fetchTravelers()
        throw error
      }
    },
    [supabase, patchLocal]
  )

  const checkIn = useCallback(
    async (id: string) => {
      const now = new Date().toISOString()
      await updateTraveler(id, { checked_in: true, check_in_time: now })
    },
    [updateTraveler]
  )

  const undoCheckIn = useCallback(
    async (id: string) => {
      await updateTraveler(id, { checked_in: false, check_in_time: null })
    },
    [updateTraveler]
  )

  const checkOut = useCallback(
    async (id: string) => {
      const now = new Date().toISOString()
      await updateTraveler(id, { checked_out: true, check_out_time: now })
    },
    [updateTraveler]
  )

  const undoCheckOut = useCallback(
    async (id: string) => {
      await updateTraveler(id, { checked_out: false, check_out_time: null })
    },
    [updateTraveler]
  )

  const setHeld = useCallback(
    async (id: string, held: boolean) => {
      const timeField = held ? { holdTime: new Date().toISOString() } : { holdTime: null }
      await updateTraveler(id, { held, ...timeField })
    },
    [updateTraveler]
  )

  const setTransported = useCallback(
    async (id: string, isBeingTransported: boolean) => {
      const timeField = isBeingTransported ? { transportTime: new Date().toISOString() } : { transportTime: null }
      await updateTraveler(id, { isBeingTransported, ...timeField })
    },
    [updateTraveler]
  )

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
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          if (event === "SIGNED_OUT") {
            setUser(null)
            setArrivalTravelers([])
            setDepartureTravelers([])
            setUniquePersons([])
            if (typeof window !== "undefined") window.location.href = "/"
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
        }
      )

      return () => {
        try {
          subscription?.unsubscribe()
        } catch {
          // ignore
        }
      }
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

    // NEW: mutation helpers for buttons
    updateTraveler,
    checkIn,
    undoCheckIn,
    checkOut,
    undoCheckOut,
    setHeld,
    setTransported,
  }
}
