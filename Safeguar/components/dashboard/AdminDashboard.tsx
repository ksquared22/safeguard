"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, UserPlus, Users, ImageUp } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { normalizePersonId } from "@/utils/travelerUtils"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Person, Traveler } from "@/types/traveler"
import { PersonList } from "../traveler/PersonList"
import { AddTravelerForm } from "../traveler/AddTravelerForm"
import { PhotoUploadSection } from "../traveler/PhotoUploadSection"

interface AdminDashboardProps {
  uniquePersons: Person[]
  setUniquePersons: React.Dispatch<React.SetStateAction<Person[]>>
  setArrivalTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  setDepartureTravelers: React.Dispatch<React.SetStateAction<Traveler[]>>
  fetchTravelers: () => Promise<void>
}

export function AdminDashboard({
  uniquePersons,
  setUniquePersons,
  setArrivalTravelers,
  setDepartureTravelers,
  fetchTravelers,
}: AdminDashboardProps) {
  const isMobile = useIsMobile()
  const supabase = useMemo(() => createClient(), [])

  const [adminTab, setAdminTab] = useState<"overview" | "add-traveler" | "manage" | "photos">(
    (typeof window !== "undefined" && (localStorage.getItem("adminTab") as any)) || "overview",
  )

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("adminTab", adminTab)
  }, [adminTab])

  const stats = useMemo(() => {
    const totalTravelers = uniquePersons.length
    const checkedInCount = uniquePersons.filter((p) => p.isAnySegmentCheckedIn).length
    const departedCount = uniquePersons.filter((p) => p.isAnySegmentCheckedOut).length
    const pendingCount = totalTravelers - checkedInCount

    return { totalTravelers, checkedInCount, departedCount, pendingCount }
  }, [uniquePersons])

  const handleAddTraveler = useCallback(
    async (
      newTravelers: (Omit<
        Traveler,
        "id" | "checked_in" | "checked_out" | "photo_url" | "check_in_time" | "check_out_time" | "notes"
      > & { notes?: string | null; photo_url?: string | null })[],
    ) => {
      const { error } = await supabase.from("travelers").insert(newTravelers)
      if (error) {
        console.error("Error adding travelers to Supabase:", error)
      } else {
        await fetchTravelers()
      }
    },
    [supabase, fetchTravelers],
  )

  const handleUpdatePerson = useCallback(
    async (updatedPerson: Person) => {
      setUniquePersons((prev) => prev.map((p) => (p.personId === updatedPerson.personId ? updatedPerson : p)))
      const { error: updateError } = await supabase
        .from("travelers")
        .update({ photo_url: updatedPerson.photo_url, notes: updatedPerson.notes })
        .eq("person_id", updatedPerson.personId)
      if (updateError) console.error("Error updating person data in DB:", updateError)
      await fetchTravelers()
    },
    [supabase, setUniquePersons, fetchTravelers],
  )

  const handleDeletePerson = useCallback(
    async (personIdToDelete: string) => {
      const canonicalId = normalizePersonId(personIdToDelete)
      const candidates = Array.from(
        new Set([
          canonicalId,
          canonicalId.replace(/^person-/, ""),
          canonicalId.replace(/-+$/, ""),
          canonicalId.replace(/^person-/, "").replace(/-+$/, ""),
        ]),
      )
      let { data: delRows, error } = await supabase.from("travelers").delete().eq("person_id", canonicalId).select("id")
      if (!error && (delRows?.length ?? 0) === 0) {
        const alt = await supabase.from("travelers").delete().in("person_id", candidates).select("id")
        delRows = alt.data
        error = alt.error
      }
      if (error) {
        console.error("Error deleting person and their segments:", error)
      } else {
        console.log("Rows deleted:", delRows?.length ?? 0)
        await fetchTravelers()
      }
    },
    [supabase, fetchTravelers],
  )

  return (
    <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as any)} className="space-y-4 sm:space-y-6">
      <TabsList
        className={`
        sticky top-[60px] sm:top-[72px] z-40 w-full rounded-xl p-1 sm:p-1.5
        bg-gradient-to-r from-white/80 via-white/60 to-white/80 backdrop-blur-md 
        shadow-md border border-white/50
        ${isMobile ? "overflow-x-auto scrollbar-hide" : ""}
      `}
      >
        <div className={`flex ${isMobile ? "min-w-max space-x-1" : "w-full justify-center space-x-2"}`}>
          <TabsTrigger
            value="overview"
            className="rounded-lg data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:shadow-blue-300/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 px-2 sm:px-3 py-2 text-gray-700 text-xs sm:text-sm whitespace-nowrap"
          >
            <LayoutDashboard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="add-traveler"
            className="rounded-lg data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:shadow-emerald-300/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 px-2 sm:px-3 py-2 text-gray-700 text-xs sm:text-sm whitespace-nowrap"
          >
            <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Add Individual
          </TabsTrigger>
          <TabsTrigger
            value="manage"
            className="rounded-lg data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:shadow-amber-300/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 px-2 sm:px-3 py-2 text-gray-700 text-xs sm:text-sm whitespace-nowrap"
          >
            <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Manage
          </TabsTrigger>
          <TabsTrigger
            value="photos"
            className="rounded-lg data-[state=active]:text-white data-[state=active]:shadow data-[state=active]:shadow-purple-300/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 px-2 sm:px-3 py-2 text-gray-700 text-xs sm:text-sm whitespace-nowrap"
          >
            <ImageUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Upload
          </TabsTrigger>
        </div>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-blue-700">Total Individuals</CardTitle>
              <div className="p-1.5 sm:p-2 bg-blue-500 rounded-lg">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-blue-800">{stats.totalTravelers}</div>
              <p className="text-[10px] sm:text-xs text-blue-700/80 mt-1">Unique persons</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-emerald-700">Checked In</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-800">{stats.checkedInCount}</div>
              <p className="text-[10px] sm:text-xs text-emerald-700/80 mt-1">At least one segment</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-amber-700">Pending</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-amber-800">{stats.pendingCount}</div>
              <p className="text-[10px] sm:text-xs text-amber-700/80 mt-1">Awaiting check-in</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-purple-700">Departed</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-2xl sm:text-3xl font-bold text-purple-800">{stats.departedCount}</div>
              <p className="text-[10px] sm:text-xs text-purple-700/80 mt-1">Marked checked out</p>
            </CardContent>
          </Card>
        </div>

        <PersonList persons={uniquePersons} showManage={false} />
      </TabsContent>

      <TabsContent value="add-traveler">
        <AddTravelerForm onAddTraveler={handleAddTraveler} />
      </TabsContent>

      <TabsContent value="manage">
        <PersonList persons={uniquePersons} showManage={true} onDeletePerson={handleDeletePerson} />
      </TabsContent>

      <TabsContent value="photos">
        <PhotoUploadSection uniquePersons={uniquePersons} onUpdatePerson={handleUpdatePerson} />
      </TabsContent>
    </Tabs>
  )
}
