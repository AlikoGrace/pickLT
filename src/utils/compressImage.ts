/**
 * Compress an image file using the browser's Canvas API.
 *
 * - Resizes the image so its longest side is at most `maxDimension` pixels.
 * - Re-encodes as JPEG at the specified `quality` (0-1).
 * - Returns a new `File` with `image/jpeg` MIME type.
 *
 * Falls back to the original file if compression fails or if the input
 * is not an image type the browser can decode.
 */
export async function compressImage(
  file: File,
  {
    maxDimension = 1920,
    quality = 0.8,
    maxSizeKB = 500,
  }: {
    /** Maximum width or height in pixels */
    maxDimension?: number
    /** JPEG quality (0–1) */
    quality?: number
    /** Target max file size in KB — iterates quality down if exceeded */
    maxSizeKB?: number
  } = {},
): Promise<File> {
  // Skip non-image files
  if (!file.type.startsWith('image/')) return file

  // Skip already-tiny files (< 50KB)
  if (file.size < 50 * 1024) return file

  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    // Calculate new dimensions keeping aspect ratio
    let newWidth = width
    let newHeight = height

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        newWidth = maxDimension
        newHeight = Math.round((height / width) * maxDimension)
      } else {
        newHeight = maxDimension
        newWidth = Math.round((width / height) * maxDimension)
      }
    }

    const canvas = new OffscreenCanvas(newWidth, newHeight)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }

    ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)
    bitmap.close()

    // Iteratively reduce quality if the result is still too large
    let currentQuality = quality
    let blob: Blob

    do {
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: currentQuality })
      if (blob.size <= maxSizeKB * 1024) break
      currentQuality -= 0.1
    } while (currentQuality > 0.2)

    // Build a filename with .jpg extension
    const baseName = file.name.replace(/\.[^.]+$/, '')
    const compressedFile = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })

    // Only return compressed version if it's actually smaller
    return compressedFile.size < file.size ? compressedFile : file
  } catch {
    // If anything goes wrong (e.g. OffscreenCanvas not supported), return original
    return file
  }
}
