// Genera bg-assets/ con el modelo "small" recortado de
// @imgly/background-removal-node, para no empaquetar los ~127MB del dist.
import fs from "node:fs";
import path from "node:path";

const src = path.resolve(
  "node_modules/@imgly/background-removal-node/dist",
);
const dst = path.resolve("bg-assets");

if (!fs.existsSync(path.join(src, "resources.json"))) {
  console.error(
    "bg-assets: no se encontro @imgly/background-removal-node/dist. Ejecuta npm install.",
  );
  process.exit(1);
}

fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(dst, { recursive: true });

const resources = JSON.parse(
  fs.readFileSync(path.join(src, "resources.json"), "utf8"),
);
const small = resources["/models/small"];

for (const chunk of small.chunks) {
  fs.copyFileSync(path.join(src, chunk.hash), path.join(dst, chunk.hash));
}
fs.writeFileSync(
  path.join(dst, "resources.json"),
  JSON.stringify({ "/models/small": small }, null, 2),
);

const sizeMb = Math.round(
  fs.readdirSync(dst)
    .map((f) => fs.statSync(path.join(dst, f)).size)
    .reduce((a, b) => a + b, 0) / 1048576,
);
console.log(`bg-assets: sincronizado (~${sizeMb}MB)`);