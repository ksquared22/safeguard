"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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

  // --- guards to stop flicker / re-init loops
  const didInitRef = useRef(false)
  const hasLoadedOnceRef = useRef(false)
  const fetchingRef = useRef<Promise<void> | null>(null)
  const lastFetchTokenRef = useRef(0)
  const hadUserRef = useRef(false)

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
          p.arrivalSegments.some((t) => (t.id === id ? (patch.checked_in ?? t.checked_in) || (patch.checked_out ?? t.checked_out) : t.checked_in || t.checked_out)) ||
          p.departureSegments.some((t) => (t.id === id ? (patch.checked_in ?? t.checked_in) || (patch.checked_out ?? t.checked_out) : t.checked_in || t.checked_out)),
      }))
    )
  }, [])

  const fetchTravelers = useCallback(async () => {
    if (!supabase) {
      setError("Database connection not available")
      setLoading(false)
      return
    }

    // Only show spinner on the very first load to avoid constant flicker
    if (!hasLoadedOnceRef.current) setLoading(true)
    setError(null)

    const myToken = ++lastFetchTokenRef.current
    const doFetch = (async () => {
      try {
        const { data, error } = await supabase.from("travelers").select("*")
        // ignore out-of-order responses
        if (myToken !== lastFetchTokenRef.current) return
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
        if (myToken !== lastFetchTokenRef.current) return
        console.error("Network error fetching travelers:", err)
        setError("Network error: Unable to connect to database")
      } finally {
        if (myToken === lastFetchTokenRef.current) {
          hasLoadedOnceRef.current = true
          setLoading(false)
        }
      }
    })()

    // de-dupe concurrent fetches
    fetchingRef.current = doFetch
    await doFetch
    fetchingRef.current = null
  }, [supabase])

  const updateTraveler = useCallback(
    async (id: string, patch: Partial<Traveler>) => {
      if (!supabase) throw new Error("Supabase not initialized")
      // optimistic UI
      patchLocal(id, patch)
      const { error } = await supabase.from("travelers").update(patch).eq("id", id)
      if (error) {
        console.error("Update failed, reverting:", error)
        await fetchTravelers() // refetch to correct optimistic state
        throw error
      }
    },
    [supabase, patchLocal, fetchTravelers]
  )

  const checkIn = useCallback(
    async (id: string) => {
      const now = new Date().toISOString()
      await updateTraveler(id, { checked_in: true, check_in_time: now })
    },
    [updateTraveler]
  )
  const undoCheckIn = useCallback(async (id: string) => updateTraveler(id, { checked_in: false, check_in_time: null }), [updateTraveler])
  const checkOut = useCallback(
    async (id: string) => {
      const now = new Date().toISOString()
      await updateTraveler(id, { checked_out: true, check_out_time: now })
    },
    [updateTraveler]
  )
  const undoCheckOut = useCallback(async (id: string) => updateTraveler(id, { checked_out: false, check_out_time: null }), [updateTraveler])
  const setHeld = useCallback(async (id: string, held: boolean) => updateTraveler(id, { held, holdTime: held ? new Date().toISOString() : null }), [updateTraveler])
  const setTransported = useCallback(
    async (id: string, isBeingTransported: boolean) =>
      updateTraveler(id, { isBeingTransported, transportTime: isBeingTransported ? new Date().toISOString() : null }),
    [updateTraveler]
  )

  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true

    const init = async () => {
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
          hadUserRef.current = true
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
        console.error("Error in init:", err)
        setError("Failed to load user data and travelers")
        setLoading(false)
      }
    }

    init()

    // attach auth listener ONCE
    let unsub: (() => void) | undefined
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
          // No hard redirects here to avoid refresh loops.
          if (event === "SIGNED_OUT") {
            setUser(null)
            hadUserRef.current = false
            // clear local data, but don't toggle loading spinner
            setArrivalTravelers([])
            setDepartureTravelers([])
            setUniquePersons([])
          } else if (session?.user) {
            hadUserRef.current = true
            ;(async () => {
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
                // light revalidation without forcing spinner
                fetchTravelers()
              } catch (err) {
                console.error("Error in auth state change handler:", err)
                setError("Failed to refresh user data")
              }
            })()
          }
        }
      )
      unsub = () => subscription?.unsubscribe()
    }

    return () => {
      try {
        unsub?.()
      } catch {}
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

    // mutations
    updateTraveler,
    checkIn,
    undoCheckIn,
    checkOut,
    undoCheckOut,
    setHeld,
    setTransported,
  }
}
