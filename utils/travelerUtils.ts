import type { Traveler, Person } from "@/types/traveler"

export function normalizePersonIdFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export function processTravelerData(travelers: Traveler[]) {
  const peopleMap: Record<string, Person> = {}
  const arrivals: Traveler[] = []
  const departures: Traveler[] = []

  travelers.forEach((traveler) => {
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
      departures.push(t)
      peopleMap[pid].departureSegments.push(t)
    }

    peopleMap[pid].isAnySegmentCheckedIn =
      peopleMap[pid].isAnySegmentCheckedIn || !!t.checked_in || !!t.checked_out
  })

  // Sort arrivals & departures by time (string ISO or time-like)
  arrivals.sort((a, b) => (a.departure_time || "").localeCompare(b.departure_time || ""))
  departures.sort((a, b) => (a.departure_time || "").localeCompare(b.departure_time || ""))

  return {
    arrivals,
    departures,
    uniquePersons: Object.values(peopleMap),
  }
}
