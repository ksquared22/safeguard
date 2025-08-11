import type { Traveler, Person } from "@/types/traveler"

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

export function normalizePersonId(idOrName: string): string {
  const raw = (idOrName || "").trim()
  if (raw.startsWith("person-")) {
    const rest = raw.slice(7)
    return `person-${sanitizeSlug(rest)}`
  }
  return normalizePersonIdFromName(raw)
}

export function processTravelerData(rawTravelers: Traveler[]): {
  arrivals: Traveler[]
  departures: Traveler[]
  uniquePersons: Person[]
} {
  const personMap = new Map<string, Person>()
  const allTravelerSegments: Traveler[] = []

  rawTravelers.forEach((traveler) => {
    const rawPersonId = (traveler as any).person_id ?? (traveler as any).personId
    const fallbackId = `person-${traveler.name.toLowerCase().replace(/\s+/g, "-")}`
    const personId = rawPersonId ?? fallbackId

    const current: Traveler = {
      ...traveler,
      personId,
      person_id: (traveler as any).person_id ?? personId,
      overnight_hotel: traveler.overnight_hotel || false,
      notes: traveler.notes || null,
      check_in_time: traveler.check_in_time || null,
      check_out_time: traveler.check_out_time || null,
    }
    allTravelerSegments.push(current)

    if (!personMap.has(personId)) {
      personMap.set(personId, {
        personId,
        name: current.name,
        photo_url: current.photo_url,
        notes: current.notes,
        arrivalSegments: [],
        departureSegments: [],
        isAnySegmentCheckedIn: false,
        isAnySegmentCheckedOut: false,
      })
    }
    const person = personMap.get(personId)!
    if (current.photo_url && !person.photo_url) person.photo_url = current.photo_url
    if (current.notes && !person.notes) person.notes = current.notes

    if (current.type === "arrival") person.arrivalSegments.push(current)
    else person.departureSegments.push(current)
  })

  const uniquePersons = Array.from(personMap.values()).map((p) => {
    p.isAnySegmentCheckedIn =
      p.arrivalSegments.some((s) => s.checked_in) || p.departureSegments.some((s) => s.checked_in)
    p.isAnySegmentCheckedOut = p.departureSegments.some((s) => s.checked_out)
    return p
  })

  const arrivals = allTravelerSegments.filter((t) => t.type === "arrival")
  const departures = allTravelerSegments.filter((t) => t.type === "departure" || t.type === "cruise")

  return { arrivals, departures, uniquePersons }
}

export function groupTravelers(travelers: Traveler[]): [string, Traveler[]][] {
  const grouped: Record<string, Traveler[]> = travelers.reduce(
    (acc, traveler) => {
      const key = `${traveler.departure_time} - ${traveler.flight_number}`
      if (!acc[key]) acc[key] = []
      acc[key].push(traveler)
      return acc
    },
    {} as Record<string, Traveler[]>,
  )
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
}
