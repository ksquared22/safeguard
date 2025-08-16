"use client"

import type React from "react"

import { useState, useCallback, memo, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Loader2, Upload, AlertCircle, CheckCircle, ImageIcon } from "lucide-react"
import { createClient } from "@/lib/supabase"
import { normalizePersonId } from "@/utils/travelerUtils"
import { useIsMobile } from "@/hooks/use-mobile"
import type { Person } from "@/types/traveler"

interface PhotoUploadSectionProps {
  uniquePersons: Person[]
  onUpdatePerson: (person: Person) => void
}

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_IMAGE_DIMENSION = 2048 // pixels

export const PhotoUploadSection = memo(function PhotoUploadSection({
  uniquePersons,
  onUpdatePerson,
}: PhotoUploadSectionProps) {
  const isMobile = useIsMobile()
  const supabase = useMemo(() => createClient(), [])

  const [selectedPersonId, setSelectedPersonId] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const sortedPersons = useMemo(() => {
    return [...uniquePersons].sort((a, b) => a.name.localeCompare(b.name))
  }, [uniquePersons])

  const personsWithPhotos = useMemo(() => {
    return uniquePersons.filter((p) => p.photo_url).sort((a, b) => a.name.localeCompare(b.name))
  }, [uniquePersons])

  const validateFile = useCallback((file: File): string => {
    if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
      return "Please select a valid image file (JPEG, PNG, or WebP)"
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }

    if (!/^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(file.name)) {
      return "Invalid file name. Please use only letters, numbers, dots, hyphens, and underscores"
    }

    return ""
  }, [])

  const processImage = useCallback((file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      img.onload = () => {
        try {
          let { width, height } = img
          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height)
            width *= ratio
            height *= ratio
          }

          canvas.width = width
          canvas.height = height
          ctx?.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const processedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now(),
                })
                resolve(processedFile)
              } else {
                reject(new Error("Failed to process image"))
              }
            },
            file.type,
            0.9, // Compression quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error("Invalid image file"))
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const handlePhotoUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedPersonId || !photo) return

      setLoading(true)
      setError("")
      setSuccess("")
      setUploadProgress(0)

      try {
        const validationError = validateFile(photo)
        if (validationError) {
          setError(validationError)
          return
        }

        const processedPhoto = await processImage(photo)
        setUploadProgress(25)

        const canonicalId = normalizePersonId(selectedPersonId)
        const candidates = Array.from(
          new Set([
            canonicalId,
            canonicalId.replace(/^person-/, ""),
            canonicalId.replace(/-+$/, ""),
            canonicalId.replace(/^person-/, "").replace(/-+$/, ""),
          ]),
        )

        const fileExt = processedPhoto.name.split(".").pop()?.toLowerCase()
        const timestamp = Date.now()
        const filePath = `${canonicalId}-${timestamp}.${fileExt}`

        setUploadProgress(50)

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("traveler-photos")
          .upload(filePath, processedPhoto, {
            cacheControl: "3600",
            upsert: false,
            contentType: processedPhoto.type,
          })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        setUploadProgress(75)

        const { data: publicUrlData } = supabase.storage.from("traveler-photos").getPublicUrl(uploadData.path)
        const publicUrl = publicUrlData.publicUrl

        const personToUpdate = uniquePersons.find((p) => p.personId === selectedPersonId)
        if (!personToUpdate) {
          throw new Error("Person not found")
        }

        let { data: updateRows, error: updateError } = await supabase
          .from("travelers")
          .update({ photo_url: publicUrl })
          .eq("person_id", canonicalId)
          .select("id")

        if (!updateError && (updateRows?.length ?? 0) === 0) {
          const { data: altRows, error: altErr } = await supabase
            .from("travelers")
            .update({ photo_url: publicUrl })
            .in("person_id", candidates)
            .select("id")
          updateRows = altRows
          updateError = altErr as any
        }

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        if ((updateRows?.length ?? 0) > 0) {
          onUpdatePerson({ ...personToUpdate, photo_url: publicUrl })
          setSuccess(`Photo uploaded successfully for ${personToUpdate.name}`)
          setSelectedPersonId("")
          setPhoto(null)
        } else {
          console.warn("No travelers matched person_id candidates:", candidates)
          setError("No matching traveler records found to update")
        }

        setUploadProgress(100)
      } catch (error) {
        console.error("Error uploading photo:", error)
        setError(error instanceof Error ? error.message : "Failed to upload photo. Please try again.")
      } finally {
        setLoading(false)
        setTimeout(() => {
          setUploadProgress(0)
          setSuccess("")
        }, 3000)
      }
    },
    [selectedPersonId, photo, validateFile, processImage, supabase, uniquePersons, onUpdatePerson],
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <CardTitle className="text-lg sm:text-xl text-blue-800">Upload Individual Photos</CardTitle>
          <CardDescription className="text-sm text-blue-700/80">
            Add photos for individual identification (max 5MB, JPEG/PNG/WebP)
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePhotoUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="traveler" className="text-blue-900/80 font-medium">
                  Select Individual *
                </Label>
                <select
                  id="traveler"
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className={`w-full p-2 border rounded-md bg-white ${isMobile ? "h-12 text-base" : ""}`}
                  required
                  disabled={loading}
                >
                  <option value="">Choose an individual...</option>
                  {sortedPersons.map((person) => (
                    <option key={person.personId} value={person.personId}>
                      {person.name} {person.photo_url ? "(has photo)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo" className="text-blue-900/80 font-medium">
                  Photo *
                </Label>
                <Input
                  id="photo"
                  type="file"
                  accept={ALLOWED_FILE_TYPES.join(",")}
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  className={`bg-white ${isMobile ? "h-12 text-base" : ""}`}
                  required
                  disabled={loading}
                />
                {photo && (
                  <p className="text-xs text-gray-600">
                    Selected: {photo.name} ({(photo.size / 1024 / 1024).toFixed(2)}MB)
                  </p>
                )}
              </div>
            </div>

            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !selectedPersonId || !photo}
              className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white ${
                isMobile ? "w-full h-12 text-base" : ""
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photo
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-100">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <CardTitle className="text-lg sm:text-xl text-purple-900 flex items-center">
            <ImageIcon className="mr-2 h-5 w-5" />
            Photo Gallery ({personsWithPhotos.length})
          </CardTitle>
          <CardDescription className="text-sm text-purple-700/80">Individuals with uploaded photos</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {personsWithPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {personsWithPhotos.map((person) => (
                <div
                  key={person.personId}
                  className="border rounded-lg p-3 text-center bg-white/80 backdrop-blur hover:shadow-md transition-shadow"
                >
                  <img
                    src={person.photo_url! || "/placeholder.svg"}
                    alt={`Photo of ${person.name}`}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-2 object-cover ring-2 ring-purple-200"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=80&width=80&text=Error"
                    }}
                  />
                  <h3 className="font-medium text-xs sm:text-sm text-gray-800 truncate" title={person.name}>
                    {person.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 truncate">ID: {person.personId.substring(0, 8)}...</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No photos uploaded yet</p>
              <p className="text-sm text-gray-500">Upload photos above to see them in the gallery</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
})
