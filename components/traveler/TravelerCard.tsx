"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Hotel } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Traveler } from "@/types/traveler"

interface TravelerCardProps {
  traveler: Traveler
  onCheckIn: () => void
  onCheckOut: () => void
  onSaveNote: (travelerId: string, type: Traveler["type"], newNote: string) => void
  mode: "arrival" | "departure" | "cruise"
}

export function TravelerCard({ traveler, onCheckIn, onCheckOut, onSaveNote, mode }: TravelerCardProps) {
  const isMobile = useIsMobile()
  const [showNoteDialog, setShowNoteDialog] = useState(false)
  const [currentNote, setCurrentNote] = useState(traveler.notes || "")

  const handleNoteSave = () => {
    onSaveNote(traveler.id, traveler.type, currentNote)
    setShowNoteDialog(false)
  }

  return (
    <>
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-lg border-0 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
          {traveler.photo_url ? (
            <img
              src={traveler.photo_url || "/placeholder.svg"}
              alt={traveler.name}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-blue-200 flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-inner flex-shrink-0">
              <span className="text-gray-400 text-[10px] sm:text-xs font-medium text-center">No Photo</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate">{traveler.name}</h3>
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {traveler.overnight_hotel && (
                <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-2 py-0.5 h-5 shadow text-xs">
                  <Hotel className="h-3 w-3 mr-1" />
                  Overnight
                </Badge>
              )}
              {traveler.checked_in && (
                <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-2 py-0.5 h-5 shadow text-xs">
                  ✓ Checked In
                </Badge>
              )}
              {traveler.checked_out && mode !== "arrival" && (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-2 py-0.5 h-5 shadow text-xs">
                  ✓ Checked Out
                </Badge>
              )}
            </div>
            {traveler.check_in_time && (
              <p className="text-[10px] sm:text-[11px] text-emerald-700 mt-1">
                In:{" "}
                {new Date(traveler.check_in_time).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {traveler.check_out_time && (
              <p className="text-[10px] sm:text-[11px] text-purple-700">
                Out:{" "}
                {new Date(traveler.check_out_time).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>

        {traveler.notes && (
          <p className="text-xs text-gray-700 mb-3 p-2 bg-gray-50 rounded-md border border-gray-200 line-clamp-2">
            {traveler.notes}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {mode === "arrival" && !traveler.checked_in && (
            <Button
              size={isMobile ? "default" : "sm"}
              onClick={onCheckIn}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white h-9 sm:h-8 text-sm"
            >
              Mark Checked In
            </Button>
          )}
          {mode !== "arrival" && !traveler.checked_in && (
            <Button
              size={isMobile ? "default" : "sm"}
              onClick={onCheckIn}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white h-9 sm:h-8 text-sm"
            >
              Mark Checked In
            </Button>
          )}
          {mode !== "arrival" && traveler.checked_in && !traveler.checked_out && (
            <Button
              size={isMobile ? "default" : "sm"}
              onClick={onCheckOut}
              variant="secondary"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 h-9 sm:h-8 text-sm"
            >
              Mark Checked Out
            </Button>
          )}
          <Button
            size={isMobile ? "default" : "sm"}
            variant="outline"
            onClick={() => setShowNoteDialog(true)}
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 h-9 sm:h-8 text-sm"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {traveler.notes ? "View/Edit Note" : "Add Note"}
          </Button>
        </div>
      </div>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className={`${isMobile ? "w-[95vw] max-w-[95vw]" : "sm:max-w-[425px]"}`}>
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Note for {traveler.name}</DialogTitle>
            <DialogDescription className="text-sm">Add or edit a note for this individual.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Enter your note here..."
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              className={`${isMobile ? "min-h-[120px] text-base" : "min-h-[100px]"} resize-none`}
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 text-right">{currentNote.length}/1000 characters</div>
          </div>
          <DialogFooter className={`${isMobile ? "flex-col space-y-2" : "flex-row space-x-2"}`}>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)} className={isMobile ? "w-full" : ""}>
              Cancel
            </Button>
            <Button onClick={handleNoteSave} className={isMobile ? "w-full" : ""}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
