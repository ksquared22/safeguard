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

  const supabase = useMemo(() => createClient(), [])

  const fetchTravelers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from("travelers").select("*")
    if (error) {
      console.error("Error fetching travelers:", error)
      setArrivalTravelers([])
      setDepartureTravelers([])
      setUniquePersons([])
    } else {
      const processed = processTravelerData(data as Traveler[])
      setArrivalTravelers(processed.arrivals)
      setDepartureTravelers(processed.departures)
      setUniquePersons(processed.uniquePersons)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const loadUserAndData = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) {
        console.error("Error getting session:", sessionError)
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
    }

    loadUserAndData()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "SIGNED_OUT") {
        setUser(null)
        setArrivalTravelers([])
        setDepartureTravelers([])
        setUniquePersons([])
        window.location.href = "/"
      } else if (session?.user) {
        const refetch = async () => {
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
  }, [supabase, fetchTravelers])

  return {
    user,
    setUser,
    loading,
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
