export interface Traveler {
  id: string
  person_id?: string
  personId: string
  name: string
  flight_number: string
  departure_time: string
  type: "arrival" | "departure" | "cruise"
  checked_in: boolean
  checked_out: boolean
  photo_url: string | null
  overnight_hotel?: boolean
  check_in_time?: string | null
  check_out_time?: string | null
  notes?: string | null
}

export interface Person {
  personId: string
  name: string
  photo_url: string | null
  notes: string | null
  arrivalSegments: Traveler[]
  departureSegments: Traveler[]
  isAnySegmentCheckedIn: boolean
  isAnySegmentCheckedOut: boolean
}

export interface User {
  id: string
  email: string
  role: "admin" | "employee"
}
