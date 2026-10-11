import { NextResponse } from "next/server";
import path from "node:path";
import { uploadImage } from "@/lib/storage";
import { jsonError, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const { removeBackground } = await import(
      "@imgly/background-removal-node"
    );
    const result = await removeBackground(
      new Blob([image], { type: "image/png" }),
      {
        model: "small",
        publicPath: `file://${path.resolve(process.cwd(), "bg-assets")}/`,
      },
    );

    const buffer = Buffer.from(await result.arrayBuffer());
    const uploaded = await uploadImage(buffer, "image/png");
    return NextResponse.json({ url: uploaded }, { status: 201 });
  } catch (e) {
    console.error("remove-background", e);
    return jsonError(
      "No se pudo eliminar el fondo. Reintenta en un momento (la primera vez tarda).",
      502,
    );
  }
}