import { createClient } from "../lib/supabase.js" // Adjust path if necessary

async function syncPhotosToDatabase() {
  console.log("Starting photo synchronization script...")

  const supabase = createClient()

  // 1. Fetch all files from the 'traveler-photos' bucket
  console.log("Fetching files from 'traveler-photos' bucket...")
  const { data: files, error: listError } = await supabase.storage.from("traveler-photos").list("", {
    limit: 100, // Adjust limit if you have more than 100 photos
    offset: 0,
    sortBy: { column: "name", order: "asc" },
  })

  if (listError) {
    console.error("Error listing files from storage:", listError)
    return
  }

  if (!files || files.length === 0) {
    console.log("No photos found in 'traveler-photos' bucket. Exiting.")
    return
  }

  console.log(`Found ${files.length} photos in storage. Processing...`)

  for (const file of files) {
    if (file.name === ".emptyFolderPlaceholder") {
      continue // Skip the placeholder file
    }

    // Extract personId from filename (e.g., "person-john-doe-1678888888888.jpg" -> "person-john-doe")
    // The filename format is personId-timestamp.ext
    const parts = file.name.split("-")
    let personId = parts[0]
    if (parts.length > 2) {
      // If there are multiple hyphens in the person's name
      personId = parts.slice(0, parts.length - 1).join("-") // Rejoin all parts except the last (timestamp.ext)
      personId = personId.substring(0, personId.lastIndexOf("-")) // Remove the last hyphen and timestamp
    }
    // Refined logic for personId extraction:
    // Assuming format is "person-name-timestamp.ext"
    // We need to remove the last part which is "timestamp.ext"
    const filenameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."))
    const lastHyphenIndex = filenameWithoutExt.lastIndexOf("-")
    if (lastHyphenIndex !== -1) {
      personId = filenameWithoutExt.substring(0, lastHyphenIndex)
    } else {
      personId = filenameWithoutExt // Fallback if no hyphen (unlikely with current naming)
    }

    // 2. Construct the public URL for the file
    const { data: publicUrlData } = supabase.storage.from("traveler-photos").getPublicUrl(file.name)

    const publicUrl = publicUrlData.publicUrl

    console.log(`  Processing file: ${file.name}, Extracted personId: ${personId}, Public URL: ${publicUrl}`)

    // 3. Update the travelers table
    const { data: updateResult, error: updateError } = await supabase
      .from("travelers")
      .update({ photo_url: publicUrl })
      .eq("person_id", personId)

    if (updateError) {
      console.error(`    Error updating traveler for personId ${personId}:`, updateError)
      console.error("    Supabase update error details:", updateError.message, updateError.details, updateError.hint)
    } else {
      console.log(`    Successfully updated traveler for personId ${personId}. Result:`, updateResult)
    }
  }

  console.log("Photo synchronization script finished.")
}

// Execute the function
syncPhotosToDatabase()
