"use client"

import type React from "react"

import { useState, useCallback, memo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle, CheckCircle, CalendarIcon, Clock } from "lucide-react"
import { normalizePersonIdFromName } from "@/utils/travelerUtils"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Traveler } from "@/types/traveler"
import { format } from "date-fns"

interface AddTravelerFormProps {
  onAddTraveler: (
    traveler: (Omit<
      Traveler,
      "id" | "checked_in" | "checked_out" | "photo_url" | "check_in_time" | "check_out_time" | "notes"
    > & { notes?: string | null; photo_url?: string | null })[],
  ) => void
}

const VALIDATION_PATTERNS = {
  name: /^[a-zA-Z\s'-]{2,50}$/,
  flightNumber: /^[A-Za-z][A-Za-z0-9\s]+[0-9]+$/,
  departureTime: /^.{1,100}$/, // Allow flexible time formats including "TBD"
} as const

export const AddTravelerForm = memo(function AddTravelerForm({ onAddTraveler }: AddTravelerFormProps) {
  const isMobile = useIsMobile()
  const [formData, setFormData] = useState({
    name: "",
    arrivalFlightNumber: "",
    arrivalDate: undefined as Date | undefined,
    arrivalTime: "",
    departureFlightNumber: "",
    departureDate: undefined as Date | undefined,
    departureTime: "",
    overnightHotel: false,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  const validateField = useCallback((field: string, value: string | Date | undefined): string => {
    switch (field) {
      case "name":
        if (!value || typeof value !== "string" || !value.trim()) return "Name is required"
        if (!VALIDATION_PATTERNS.name.test(value.trim())) {
          return "Name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes"
        }
        return ""
      case "arrivalFlightNumber":
      case "departureFlightNumber":
        if (!value || typeof value !== "string" || !value.trim()) return "Flight number is required"
        if (!VALIDATION_PATTERNS.flightNumber.test(value.trim())) {
          return "Flight number must start with a letter and end with numbers (e.g., 'Alaska Airlines 66')"
        }
        return ""
      case "arrivalDate":
      case "departureDate":
        if (!value || !(value instanceof Date)) return "Date is required"
        return ""
      case "arrivalTime":
      case "departureTime":
        if (!value || typeof value !== "string" || !value.trim()) return "Time is required"
        return ""
      default:
        return ""
    }
  }, [])

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate all fields
    const fieldsToValidate = [
      "name",
      "arrivalFlightNumber",
      "arrivalDate",
      "arrivalTime",
      "departureFlightNumber",
      "departureDate",
      "departureTime",
    ]

    fieldsToValidate.forEach((field) => {
      const value = formData[field as keyof typeof formData]
      const error = validateField(field, value)
      if (error) newErrors[field] = error
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, validateField])

  const formatDateTime = useCallback((date: Date, time: string): string => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]

    const month = monthNames[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()

    return `${month} ${day}, ${year} ${time}`
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) {
        return
      }

      setLoading(true)
      setErrors({})

      try {
        const personId = normalizePersonIdFromName(formData.name)

        const arrivalDateTime = formatDateTime(formData.arrivalDate!, formData.arrivalTime)
        const departureDateTime = formatDateTime(formData.departureDate!, formData.departureTime)

        const arrivalTraveler = {
          person_id: personId,
          name: formData.name.trim(),
          flight_number: formData.arrivalFlightNumber.trim(),
          departure_time: arrivalDateTime,
          type: "arrival" as Traveler["type"],
          overnight_hotel: formData.overnightHotel,
          notes: null,
          photo_url: null,
        }

        const departureTraveler = {
          person_id: personId,
          name: formData.name.trim(),
          flight_number: formData.departureFlightNumber.trim(),
          departure_time: departureDateTime,
          type: "departure" as Traveler["type"],
          overnight_hotel: false,
          notes: null,
          photo_url: null,
        }

        await onAddTraveler([arrivalTraveler, departureTraveler])

        setFormData({
          name: "",
          arrivalFlightNumber: "",
          arrivalDate: undefined,
          arrivalTime: "",
          departureFlightNumber: "",
          departureDate: undefined,
          departureTime: "",
          overnightHotel: false,
        })
        setSuccess(true)

        setTimeout(() => setSuccess(false), 5000)
      } catch (error) {
        console.error("Error adding traveler:", error)
        setErrors({ submit: "Failed to add traveler. Please try again." })
      } finally {
        setLoading(false)
      }
    },
    [formData, validateForm, onAddTraveler, formatDateTime],
  )

  const generateTimeOptions = useCallback(() => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time12 = new Date(2024, 0, 1, hour, minute).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        times.push(time12)
      }
    }
    return times
  }, [])

  const timeOptions = generateTimeOptions()

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-100">
      <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
        <CardTitle className="text-lg sm:text-xl text-emerald-900">Add New Individual</CardTitle>
        <CardDescription className="text-sm text-emerald-800/80">
          Enter individual name, flight, and time information
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Individual added successfully! Both arrival and departure segments have been created.
            </AlertDescription>
          </Alert>
        )}

        {errors.submit && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errors.submit}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name" className="text-emerald-900/90 font-medium">
                Full Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className={`bg-white ${errors.name ? "border-red-500" : ""} ${isMobile ? "h-12 text-base" : ""}`}
                placeholder="Enter full name"
                maxLength={50}
                required
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-red-600">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrivalFlight" className="text-emerald-900/90 font-medium">
                Arrival Flight *
              </Label>
              <Input
                id="arrivalFlight"
                value={formData.arrivalFlightNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, arrivalFlightNumber: e.target.value }))}
                placeholder="e.g., Alaska Airlines 66"
                className={`bg-white ${errors.arrivalFlightNumber ? "border-red-500" : ""} ${
                  isMobile ? "h-12 text-base" : ""
                }`}
                maxLength={50}
                required
              />
              {errors.arrivalFlightNumber && <p className="text-sm text-red-600">{errors.arrivalFlightNumber}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-emerald-900/90 font-medium">Arrival Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal bg-white ${
                      errors.arrivalDate ? "border-red-500" : ""
                    } ${isMobile ? "h-12 text-base" : ""}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.arrivalDate ? format(formData.arrivalDate, "PPP") : "Select arrival date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.arrivalDate}
                    onSelect={(date) => setFormData((prev) => ({ ...prev, arrivalDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.arrivalDate && <p className="text-sm text-red-600">{errors.arrivalDate}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-emerald-900/90 font-medium">Arrival Time *</Label>
              <Select
                value={formData.arrivalTime}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, arrivalTime: value }))}
              >
                <SelectTrigger
                  className={`bg-white ${errors.arrivalTime ? "border-red-500" : ""} ${isMobile ? "h-12 text-base" : ""}`}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select arrival time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.arrivalTime && <p className="text-sm text-red-600">{errors.arrivalTime}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="departureFlight" className="text-emerald-900/90 font-medium">
                Departure Flight *
              </Label>
              <Input
                id="departureFlight"
                value={formData.departureFlightNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, departureFlightNumber: e.target.value }))}
                placeholder="e.g., China Airlines 21"
                className={`bg-white ${errors.departureFlightNumber ? "border-red-500" : ""} ${
                  isMobile ? "h-12 text-base" : ""
                }`}
                maxLength={50}
                required
              />
              {errors.departureFlightNumber && <p className="text-sm text-red-600">{errors.departureFlightNumber}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-emerald-900/90 font-medium">Departure Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal bg-white ${
                      errors.departureDate ? "border-red-500" : ""
                    } ${isMobile ? "h-12 text-base" : ""}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.departureDate ? format(formData.departureDate, "PPP") : "Select departure date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.departureDate}
                    onSelect={(date) => setFormData((prev) => ({ ...prev, departureDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.departureDate && <p className="text-sm text-red-600">{errors.departureDate}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-emerald-900/90 font-medium">Departure Time *</Label>
              <Select
                value={formData.departureTime}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, departureTime: value }))}
              >
                <SelectTrigger
                  className={`bg-white ${errors.departureTime ? "border-red-500" : ""} ${isMobile ? "h-12 text-base" : ""}`}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Select departure time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.departureTime && <p className="text-sm text-red-600">{errors.departureTime}</p>}
            </div>

            <div className="flex items-center space-x-2 md:col-span-2">
              <Checkbox
                id="overnight"
                checked={formData.overnightHotel}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, overnightHotel: checked === true }))}
              />
              <Label htmlFor="overnight" className="text-emerald-900/90 font-medium cursor-pointer">
                Overnight Hotel Required
              </Label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className={`bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white ${
              isMobile ? "w-full h-12 text-base" : ""
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Individual...
              </>
            ) : (
              "Add Individual"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
})
