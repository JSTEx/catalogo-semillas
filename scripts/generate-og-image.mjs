import sharp from "sharp";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = resolve(root, "public", "og-image.svg");
const output = resolve(root, "public", "og-night.png");
const logo = resolve(root, "public", "logo-dark.png");

const logoBuffer = await sharp(logo)
  .trim()
  .resize(240, 110, { fit: "inside" })
  .png()
  .toBuffer();
const image = await sharp(source)
  .composite([{ input: logoBuffer, left: 480, top: 155 }])
  .png()
  .toFile(output);
if (image.width !== 1200 || image.height !== 630) {
  throw new Error(
    `La imagen Open Graph debe medir 1200x630; se generó ${image.width}x${image.height}.`,
  );
}
console.log(`Imagen Open Graph generada: ${image.width}x${image.height}`);
