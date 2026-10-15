/**
 * Smoke test sin dependencias externas.
 *
 * Uso:
 *   node scripts/smoke.mjs                        # solo lectura
 *   SMOKE_BASE=https://... node scripts/smoke.mjs # contra otro entorno
 *
 * Flujo con escritura (crea y elimina un pedido de prueba) si se define:
 *   SMOKE_WRITE=1 ADMIN_USER=... ADMIN_PASSWORD=...
 */
const BASE = (process.env.SMOKE_BASE || "http://localhost:3000").replace(/\/+$/, "");
const ORIGIN = { Origin: BASE, "Content-Type": "application/json" };

let failures = 0;
function check(name, ok, detail = "") {
  const mark = ok ? "OK  " : "FAIL";
  if (!ok) failures++;
  console.log(`${mark}  ${name}${detail ? "  " + detail : ""}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getStatus(path) {
  const res = await fetch(BASE + path, { headers: { Origin: BASE } });
  return res.status;
}

console.log(`Smoke contra ${BASE}\n`);

for (const path of ["/", "/logo.png", "/og.png", "/icons/favicon.png", "/icons/apple-icon.png"]) {
  const status = await getStatus(path).catch(() => 0);
  check(`GET ${path}`, status === 200, `-> ${status}`);
}

const statusRes = await fetch(BASE + "/api/orders/status?ids=", { headers: { Origin: BASE } }).catch(() => null);
check("GET /api/orders/status (batch)", statusRes?.status === 200, `-> ${statusRes?.status ?? 0}`);

const html = await fetch(BASE + "/").then((r) => r.text()).catch(() => "");
check("catalogo incluye og:image", /og:image/.test(html));
check("catalogo incluye favicon", /icons\/favicon/.test(html));

if (process.env.SMOKE_WRITE === "1") {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) {
    check("escritura: faltan ADMIN_USER/ADMIN_PASSWORD", false);
  } else {
    const login = await fetch(BASE + "/api/auth/login", {
      method: "POST",
      headers: ORIGIN,
      body: JSON.stringify({ username: user, password: pass }),
    });
    const cookie = login.headers.get("set-cookie")?.split(";")[0] ?? "";
    const authH = { ...ORIGIN, Cookie: cookie };
    check("login admin", login.status === 200, `-> ${login.status}`);

    const products = await fetch(BASE + "/api/products").then((r) => r.json());
    const image = products.products?.[0]?.imageUrl;
    const createdProduct = await fetch(BASE + "/api/products", {
      method: "POST",
      headers: authH,
      body: JSON.stringify({ name: "Smoke Test", category: "Otros", status: "available", imageUrl: image, priceCents: 100, stock: 3 }),
    }).then((r) => r.json());
    const productId = createdProduct.product?.id;
    check("crear producto de prueba", Boolean(productId));

    const createdOrder = await fetch(BASE + "/api/orders", {
      method: "POST",
      headers: ORIGIN,
      body: JSON.stringify({ customerName: "Smoke", customerPhone: "50370009999", delivery: "retiro", payment: "efectivo", items: [{ productId, quantity: 1 }] }),
    }).then((r) => r.json());
    const orderId = createdOrder.order?.id;
    check("crear pedido de prueba", Boolean(orderId));

    if (orderId) {
      const cancel = await fetch(`${BASE}/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: ORIGIN,
        body: JSON.stringify({ phone: "70009999" }),
      }).then((r) => r.json());
      check("cancelar pedido", cancel.order?.status === "cancelled", `-> ${cancel.order?.status}`);
      await fetch(`${BASE}/api/orders/${orderId}`, { method: "DELETE", headers: authH });
    }
    if (productId) {
      await fetch(`${BASE}/api/products/${productId}`, { method: "DELETE", headers: authH });
    }
    await sleep(500);
  }
}

console.log(failures === 0 ? "\nTodo OK" : `\n${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
