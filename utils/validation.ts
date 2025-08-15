import { z } from "zod"

export const travelerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  arrivalFlightNumber: z.string().min(1, "Arrival flight is required"),
  arrivalDate: z.date({ required_error: "Arrival date is required" }),
  arrivalTime: z.string().min(1, "Arrival time is required"),
  departureFlightNumber: z.string().min(1, "Departure flight is required"),
  departureDate: z.date({ required_error: "Departure date is required" }),
  departureTime: z.string().min(1, "Departure time is required"),
  overnightHotel: z.boolean().default(false),
})

export type TravelerForm = z.infer<typeof travelerSchema>

/**
 * Example:
 * const res = travelerSchema.safeParse(formData)
 * if (!res.success) {
 *   const fieldErrors = res.error.flatten().fieldErrors
 *   // map into your UI as needed
 * }
 */
