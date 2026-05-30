/**
 * Cloudinary Transparent Image Compressor and Secure Uploader Utility.
 * Performs browser-side compression (canvas-based) to save storage and optimize mobile performance,
 * then uploads to Cloudinary with an automatic offline fallback.
 */

interface CloudinaryResponse {
  secure_url: string;
}

/**
 * Standard client-side image compression using HTML5 Canvas.
 * Keeps aspect ratio intact, restricts dimension bounds, and outputs high-quality compressed JPEG Blobs.
 */
export function compressImage(file: File, maxDimension = 1000, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate new proportions
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Draw onto canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback to raw file if canvas context unavailable
          return;
        }

        // Draw with high quality interpolation
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Uploads a file (with automatic canvas-based background compression) to Cloudinary.
 * Fully transparent for the vendor.
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  try {
    // 1. Compress first to reduce upload payload size and save user bandwidth
    const compressedBlob = await compressImage(file, 1000, 0.8);
    
    // Read from Vite environment variables (declared in .env.example)
    const metaObj = import.meta as any;
    const cloudName = metaObj.env?.VITE_CLOUDINARY_CLOUD_NAME || 'catalogogo';
    const uploadPreset = metaObj.env?.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';

    // 2. Formulate dynamic FormData request
    const formData = new FormData();
    formData.append('file', compressedBlob, file.name);
    formData.append('upload_preset', uploadPreset);

    // If utilizing a standard placeholder/demo cloud or unset keys, try uploading,
    // but gracefully catch failure to fall back so the application is completely robust.
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data: CloudinaryResponse = await response.json();
      let secureUrl = data.secure_url;
      // Inject smart Cloudinary format optimization at URL level if applicable
      if (secureUrl.includes('res.cloudinary.com')) {
        secureUrl = secureUrl.replace('/upload/', '/upload/f_auto,q_auto/');
      }
      return secureUrl;
    } else {
      console.warn("Cloudinary upload failed on endpoint, falling back to local simulation.");
    }
  } catch (err) {
    console.warn("Cloudinary connection issues or missing presets. Using robust base64 fallback.", err);
  }

  // 3. Robust localized base64 fallback (works seamlessly offline in sandboxes/frames)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(file);
  });
}
