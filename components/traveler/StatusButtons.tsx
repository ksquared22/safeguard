"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTravelers } from "@/hooks/useTravelers"

export function StatusButtons({ travelerId, checked_in, checked_out, held, isBeingTransported }:{
  travelerId: string
  checked_in?: boolean
  checked_out?: boolean
  held?: boolean
  isBeingTransported?: boolean
}) {
  const { checkIn, undoCheckIn, checkOut, undoCheckOut, setHeld, setTransported } = useTravelers()
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (label: string, fn: () => Promise<any>) => {
    try {
      setBusy(label)
      await fn()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {checked_in ? (
        <Button type="button" variant="secondary" disabled={busy!==null} onClick={() => run("undoCheckIn", () => undoCheckIn(travelerId))}>
          {busy==="undoCheckIn" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Undo Check-in"}
        </Button>
      ) : (
        <Button type="button" variant="default" disabled={busy!==null} onClick={() => run("checkIn", () => checkIn(travelerId))}>
          {busy==="checkIn" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check in"}
        </Button>
      )}

      {checked_out ? (
        <Button type="button" variant="secondary" disabled={busy!==null} onClick={() => run("undoCheckOut", () => undoCheckOut(travelerId))}>
          {busy==="undoCheckOut" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Undo Check-out"}
        </Button>
      ) : (
        <Button type="button" variant="default" disabled={busy!==null} onClick={() => run("checkOut", () => checkOut(travelerId))}>
          {busy==="checkOut" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check out"}
        </Button>
      )}

      <Button
        type="button"
        variant={held ? "secondary" : "outline"}
        disabled={busy!==null}
        onClick={() => run("held", () => setHeld(travelerId, !held))}
      >
        {busy==="held" ? <Loader2 className="h-4 w-4 animate-spin" /> : (held ? "Unhold" : "Hold")}
      </Button>

      <Button
        type="button"
        variant={isBeingTransported ? "secondary" : "outline"}
        disabled={busy!==null}
        onClick={() => run("transport", () => setTransported(travelerId, !isBeingTransported))}
      >
        {busy==="transport" ? <Loader2 className="h-4 w-4 animate-spin" /> : (isBeingTransported ? "Stop Transport" : "Transport")}
      </Button>
    </div>
  )
}
