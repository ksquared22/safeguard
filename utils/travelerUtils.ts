import type { Traveler, Person } from "@/types/traveler"

// --- helpers ----------------------------------------------------

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function normalizePersonIdFromName(name: string): string {
  const slug = sanitizeSlug(name)
  return `person-${slug}`
}

// --- backward-compat API used by EmployeeDashboard ----------------
// Some components import groupTravelers; keep it exported.
export function groupTravelers(travelers: Traveler[]): [string, Traveler[]][] {
  const grouped: Record<string, Traveler[]> = travelers.reduce((acc, traveler) => {
    const key = `${traveler.departure_time} - ${traveler.flight_number}`
    if (!acc[key]) acc[key] = []
    acc[key].push(traveler)
    return acc
  }, {} as Record<string, Traveler[]>)

  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
}

// --- main data shaper used across the app ------------------------

export function processTravelerData(rawTravelers: Traveler[]) {
  const peopleMap: Record<string, Person> = {}
  const arrivals: Traveler[] = []
  const departuresAll: Traveler[] = []

  rawTravelers.forEach((traveler) => {
    const pid =
      (traveler.person_id && traveler.person_id.trim()) ||
      (traveler.personId && traveler.personId.trim()) ||
      normalizePersonIdFromName(traveler.name)

    if (!peopleMap[pid]) {
      peopleMap[pid] = {
        personId: pid,
        name: traveler.name,
        photo_url: traveler.photo_url ?? null,
        notes: traveler.notes ?? null,
        arrivalSegments: [],
        departureSegments: [],
        isAnySegmentCheckedIn: false,
      }
    }

    const t: Traveler = {
      ...traveler,
      personId: pid,
      person_id: traveler.person_id ?? pid,
      notes: traveler.notes ?? null,
      photo_url: traveler.photo_url ?? null,
      checked_in: traveler.checked_in ?? false,
      checked_out: traveler.checked_out ?? false,
      check_in_time: traveler.check_in_time ?? null,
      check_out_time: traveler.check_out_time ?? null,
    }

    if (t.type === "arrival") {
      arrivals.push(t)
      peopleMap[pid].arrivalSegments.push(t)
    } else {
      departuresAll.push(t)
      peopleMap[pid].departureSegments.push(t)
    }

    peopleMap[pid].isAnySegmentCheckedIn =
      peopleMap[pid].isAnySegmentCheckedIn || !!t.checked_in || !!t.checked_out
  })

  // Sort for stable UI
  arrivals.sort((a, b) => (a.departure_time || "").localeCompare(b.departure_time || ""))
  departuresAll.sort((a, b) => (a.departure_time || "").localeCompare(b.departure_time || ""))

  // BUSINESS RULE:
  // A traveler should NOT show up in the DEPARTURES list
  // until they have been CHECKED IN on the ARRIVALS list.
  const departures = departuresAll.filter((t) => {
    const person = peopleMap[t.personId]
    if (!person) return false
    // Show departures only if this person has at least one ARRIVAL segment checked in
    return person.arrivalSegments.some((seg) => seg.checked_in === true)
  })

  return {
    arrivals,
    departures,
    uniquePersons: Object.values(peopleMap),
  }
}
