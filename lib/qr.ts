import QRCode from "qrcode";

/** Genera un QR en base64 (data URL) para un link de catálogo */
export async function generateQRDataURL(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/** Genera un QR como Buffer PNG para descarga */
export async function generateQRBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: 800,
    margin: 3,
  });
}
