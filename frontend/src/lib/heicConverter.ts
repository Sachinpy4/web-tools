'use client';

// Check if code is running in browser environment
const isBrowser = typeof window !== 'undefined';

// Only import heic2any in browser environment
let heic2any: any;
if (isBrowser) {
  import('heic2any').then(module => {
    heic2any = module.default;
  });
}

/**
 * Converts a HEIC/HEIF file to JPEG format
 * @param file The HEIC/HEIF file to convert
 * @returns A Promise that resolves to a JPEG File object
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  // If not in browser or not a HEIC/HEIF file, return the original file
  if (!isBrowser || 
      (!file.type.includes('heic') && !file.name.toLowerCase().endsWith('.heic') && 
       !file.type.includes('heif') && !file.name.toLowerCase().endsWith('.heif'))) {
    return file;
  }

  try {
    // Make sure heic2any is loaded
    if (!heic2any) {
      heic2any = (await import('heic2any')).default;
    }

    // Convert the HEIC file to JPEG
    const jpegBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9 // High quality
    }) as Blob;

    // Create a new file with the converted JPEG data
    // Use the original filename but replace the extension with .jpg
    const fileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([jpegBlob], fileName, { type: 'image/jpeg' });
  } catch (error: any) {
    console.error('Error converting HEIC/HEIF to JPEG:', error);
    throw new Error(`Failed to convert HEIC/HEIF image. ${error.message || ''}`);
  }
}

/**
 * Processes an array of files, converting any HEIC/HEIF files to JPEG
 * @param files Array of files to process
 * @returns A Promise that resolves to an array of processed files
 */
export async function processHeicFiles(files: File[]): Promise<File[]> {
  // If not in browser, return files unchanged
  if (!isBrowser) {
    return files;
  }

  const convertPromises = files.map(async (file) => {
    try {
      return await convertHeicToJpeg(file);
    } catch (error: any) {
      console.error(`Error processing file ${file.name}:`, error);
      return file; // Return original file if conversion fails
    }
  });

  return Promise.all(convertPromises);
} 