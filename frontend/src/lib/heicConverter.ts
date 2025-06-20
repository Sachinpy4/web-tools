'use client';

// Check if code is running in browser environment
const isBrowser = typeof window !== 'undefined';

// Cache for the heic2any module to avoid repeated imports
let heic2anyModule: any = null;
let heic2anyPromise: Promise<any> | null = null;

/**
 * Lazy load heic2any module with proper error handling
 */
async function getHeic2Any() {
  if (heic2anyModule) {
    return heic2anyModule;
  }
  
  if (!heic2anyPromise) {
    heic2anyPromise = import('heic2any').then(module => {
      heic2anyModule = module.default;
      return heic2anyModule;
    }).catch(error => {
      // Reset promise on error so it can be retried
      heic2anyPromise = null;
      throw new Error(`Failed to load HEIC converter: ${error.message}`);
    });
  }
  
  return heic2anyPromise;
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
    // Get the heic2any module with proper async handling
    const heic2any = await getHeic2Any();

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
    throw new Error(`Failed to convert HEIC/HEIF image: ${error.message || 'Unknown error'}`);
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
      console.warn(`Error processing file ${file.name}:`, error);
      return file; // Return original file if conversion fails
    }
  });

  return Promise.all(convertPromises);
} 