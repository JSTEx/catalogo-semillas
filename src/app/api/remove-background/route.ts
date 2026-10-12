import { NextResponse } from "next/server";
import path from "node:path";
import sharp from "sharp";
import { uploadImage } from "@/lib/storage";
import { jsonError, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

// Limpia el halo de color del borde: en pixeles semitransparentes el canal RGB
// aun conserva restos del fondo eliminado. Para cada borde, se mezcla con el
// color del vecino mas opaco (como hacen los motores tipo Canva).
function defringe(data: Buffer, width: number, height: number) {
  const edge: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 0 && data[i + 3] < 255) edge.push(i);
    }
  }
  for (const i of edge) {
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    let best = -1;
    let bestFail = -1;
    for (let oy = Math.max(0, y - 1); oy <= Math.min(height - 1, y + 1); oy++) {
      for (let ox = Math.max(0, x - 1); ox <= Math.min(width - 1, x + 1); ox++) {
        if (ox === x && oy === y) continue;
        const j = (oy * width + ox) * 4;
        const a = data[j + 3];
        if (a >= 240) {
          best = j;
          break;
        }
        if (a < 255 && a > bestFail) bestFail = j;
      }
      if (best >= 0) break;
    }
    if (best >= 0) {
      const t = 0.55;
      data[i] = Math.round(data[i] * t + data[best] * (1 - t));
      data[i + 1] = Math.round(data[i + 1] * t + data[best + 1] * (1 - t));
      data[i + 2] = Math.round(data[i + 2] * t + data[best + 2] * (1 - t));
    }
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.authorized) return guard.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Cuerpo de la peticion invalido", 400);
  }

  const url = (json as { url?: unknown }).url;
  if (typeof url !== "string" || url.length === 0 || url.length > 2048) {
    return jsonError("URL invalida", 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return jsonError("URL invalida", 400);
  }
  if (parsed.protocol !== "https:") {
    return jsonError("La URL debe usar HTTPS", 400);
  }

  try {
    const image = await fetch(parsed).then((r) => {
      if (!r.ok) throw new Error("No se pudo descargar la imagen");
      return r.arrayBuffer();
    });

    // Limitar el lado mayor a 2048 para acelerar el modelo y evitar memoria.
    const decoded = sharp(Buffer.from(image)).rotate().resize(2048, 2048, {
      fit: "inside",
      withoutEnlargement: true,
    });
    const meta = await decoded.metadata();
    const w = Math.max(1, meta.width ?? 0);
    const h = Math.max(1, meta.height ?? 0);
    const conv = Buffer.from(await decoded.png().toBuffer());

    const { removeBackground } = await import(
      "@imgly/background-removal-node"
    );
    const result = await removeBackground(
      new Blob([conv], { type: "image/png" }),
      {
        model: "medium",
        publicPath: `file://${path.resolve(process.cwd(), "bg-assets")}/`,
      },
    );

    // Postproceso: endurecer el alpha (quitar lavado/fondo fantasma),
    // defringe del halo de color en bordes y WEBP premultiplicado.
    const buffer = Buffer.from(await result.arrayBuffer());
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Defringe primero sobre la mascara suave (los pixeles semi-transparentes
    // conservan resto del fondo en RGB); luego endurecer el alpha.
    defringe(data, info.width, info.height);

    const aHardLow = 48;
    const aHardHigh = 200;
    for (let i = 3; i < data.length; i += 4) {
      const a = data[i];
      if (a <= aHardLow) {
        data[i] = 0;
      } else if (a >= aHardHigh) {
        data[i] = 255;
      } else {
        const t = (a - aHardLow) / (aHardHigh - aHardLow);
        data[i] = Math.round(t * 255);
      }
    }

    const webp = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: info.channels },
    })
      .webp({
        quality: 92,
        alphaQuality: 95,
        effort: 4,
        smartSubsample: true,
      })
      .toBuffer();

    const uploaded = await uploadImage(webp, "image/webp");
    return NextResponse.json({ url: uploaded }, { status: 201 });
  } catch (e) {
    console.error("remove-background", e);
    return jsonError(
      "No se pudo eliminar el fondo. Reintenta en un momento (la primera vez tarda).",
      502,
    );
  }
}