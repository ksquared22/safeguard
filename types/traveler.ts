export type TravelerType = "arrival" | "departure"

export interface Traveler {
  id: string
  name: string
  flight_number: string
  departure_time: string
  type: TravelerType
  overnight_hotel: boolean

  // IDs (DB snake_case + normalized camelCase). Either may be present.
  person_id?: string
  personId?: string

  // Optional fields from DB / UI
  notes?: string | null
  checked_in?: boolean
  checked_out?: boolean
  photo_url?: string | null
  check_in_time?: string | null
  check_out_time?: string | null

  // additional flags (optional)
  isBeingTransported?: boolean
  transportTime?: string | null
  held?: boolean
  holdTime?: string | null
}

export interface Person {
  personId: string
  name: string
  photo_url: string | null
  notes: string | null
  arrivalSegments: Traveler[]
  departureSegments: Traveler[]
  isAnySegmentCheckedIn: boolean
}
