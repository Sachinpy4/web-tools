/**
 * Utility functions for image processing
 */

/**
 * Convert a File object to a data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Format file size in a human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file extension from File object
 */
export const getFileExtension = (file: File): string => {
  return file.name.split('.').pop()?.toLowerCase() || ''
}

/**
 * Check if file is a valid image type
 */
export const isValidImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
  return validTypes.includes(file.type)
}

/**
 * Create a filename with a suffix
 * e.g. image.jpg -> image_compressed.jpg
 */
export const createFilenameWithSuffix = (file: File, suffix: string): string => {
  const extension = getFileExtension(file)
  const nameWithoutExtension = file.name.slice(0, file.name.length - extension.length - 1)
  return `${nameWithoutExtension}_${suffix}.${extension}`
}

/**
 * Calculate percentage difference between two numbers
 */
export const calculatePercentageDifference = (original: number, current: number): number => {
  const difference = original - current
  return Math.round((difference / original) * 100)
} 