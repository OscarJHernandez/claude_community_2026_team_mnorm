import sharp from "sharp";

/** Normalise any image to a small JPEG (max 512px side) so file type and size never hint at real vs fake. */
export async function toJpeg(input) {
  return sharp(input)
    .rotate() // respect camera orientation
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
