/**
 * The text to put in a location input when the user picks a Mapbox suggestion.
 *
 * Suggestions carry a `name` ("Adum") and a `fullAddress` built as
 * `full_address ?? place_formatted ?? name`. For a street result `full_address`
 * already contains the name ("12 Hauptstrasse, 10115 Berlin"), but for a
 * locality or POI Mapbox returns no `full_address` and `place_formatted` is
 * only the surrounding *context* ("Kumasi, Ashanti, Ghana") — so using the
 * address alone silently drops which place was chosen. Join the two unless the
 * context already spells the name out.
 */
export function composeAddressLabel(
  name: string | undefined | null,
  address: string | undefined | null,
): string {
  const placeName = (name ?? '').trim()
  const context = (address ?? '').trim()
  if (!context) return placeName
  if (!placeName) return context
  // Compare on the first segment so "Adum" is not considered present in a
  // context whose *later* parts merely mention a similarly named region.
  const head = context.split(',')[0].trim().toLowerCase()
  if (head === placeName.toLowerCase()) return context
  return `${placeName}, ${context}`
}
