import sharp from "sharp";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const logo = resolve(root, "public", "logo-dark.png");
const previews = [
  {
    source: resolve(root, "public", "og-image.svg"),
    output: resolve(root, "public", "og-night.png"),
    logoTop: 155,
  },
  {
    source: resolve(root, "public", "og-tracking.svg"),
    output: resolve(root, "public", "og-tracking.png"),
    logoTop: 105,
  },
];

const logoBuffer = await sharp(logo)
  .trim()
  .resize(240, 110, { fit: "inside" })
  .png()
  .toBuffer();

for (const { source, output, logoTop } of previews) {
  const image = await sharp(source)
    .composite([{ input: logoBuffer, left: 480, top: logoTop }])
    .png()
    .toFile(output);
  if (image.width !== 1200 || image.height !== 630) {
    throw new Error(
      `La imagen Open Graph debe medir 1200x630; se generó ${image.width}x${image.height}.`,
    );
  }
  console.log(`Imagen Open Graph generada: ${output.split(/[\\/]/).pop()} (${image.width}x${image.height})`);
}
