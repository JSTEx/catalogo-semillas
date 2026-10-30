/**
 * Smoke test sin dependencias externas.
 *
 * Uso:
 *   node scripts/smoke.mjs                        # solo lectura
 *   SMOKE_BASE=https://... node scripts/smoke.mjs # contra otro entorno
 *
 * Flujo con escritura (crea y elimina un pedido de prueba) si se define:
 *   SMOKE_WRITE=1 ADMIN_COOKIE="authjs.session-token=..."
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

const adminResponse = await fetch(BASE + "/admin", { redirect: "manual" }).catch(() => null);
const adminHtml = await adminResponse?.text().catch(() => "") ?? "";
check(
  "GET /admin redirige al acceso por correo",
  adminResponse?.status === 200 &&
    adminHtml.includes('url=/auth/signin?callbackUrl=%2Fadmin'),
  `-> ${adminResponse?.status ?? 0}`,
);

const oldLogin = await fetch(BASE + "/api/auth/login", {
  method: "POST",
  headers: ORIGIN,
  body: JSON.stringify({ username: "retired", password: "retired-password" }),
}).catch(() => null);
check("login antiguo deshabilitado", (oldLogin?.status ?? 0) >= 400, `-> ${oldLogin?.status ?? 0}`);

const adminList = await fetch(BASE + "/api/admin/allowed", {
  headers: { Origin: BASE },
}).catch(() => null);
check("lista de administradores protegida", adminList?.status === 401, `-> ${adminList?.status ?? 0}`);

const productMutation = await fetch(BASE + "/api/products", {
  method: "POST",
  headers: ORIGIN,
  body: JSON.stringify({ name: "Sin sesión" }),
}).catch(() => null);
check("ediciones protegidas sin sesión", productMutation?.status === 401, `-> ${productMutation?.status ?? 0}`);

const statusRes = await fetch(BASE + "/api/orders/status?ids=", { headers: { Origin: BASE } }).catch(() => null);
check("GET /api/orders/status (batch)", statusRes?.status === 200, `-> ${statusRes?.status ?? 0}`);

const html = await fetch(BASE + "/").then((r) => r.text()).catch(() => "");
check("catalogo incluye og:image", /og:image/.test(html));
check("catalogo incluye favicon", /icons\/favicon/.test(html));
check("login de Google visible mientras carga la sesion", /aria-label="Entrar con Google"/.test(html));

if (process.env.SMOKE_WRITE === "1") {
  const cookie = process.env.ADMIN_COOKIE;
  if (!cookie) {
    check("escritura: falta ADMIN_COOKIE", false);
  } else {
    const authH = { ...ORIGIN, Cookie: cookie };

    const products = await fetch(BASE + "/api/products").then((r) => r.json());
    const image = products.products?.[0]?.imageUrl;
    const createdProduct = await fetch(BASE + "/api/products", {
      method: "POST",
      headers: authH,
      body: JSON.stringify({ name: "Smoke Test", category: "Otros", status: "available", imageUrl: image, priceCents: 100, stock: 3 }),
    }).then((r) => r.json());
    const productId = createdProduct.product?.id;
    check("crear producto de prueba", Boolean(productId));

    if (productId) {
      const hideResponse = await fetch(`${BASE}/api/products/${productId}`, {
        method: "PATCH",
        headers: authH,
        body: JSON.stringify({ isHidden: true }),
      }).catch(() => null);
      const hiddenProduct = await hideResponse?.json().catch(() => null);
      check("ocultar producto desde admin", hideResponse?.ok && hiddenProduct?.product?.isHidden === true);

      const publicProducts = await fetch(BASE + "/api/products")
        .then((r) => r.json())
        .catch(() => null);
      check(
        "producto oculto no aparece en catalogo publico",
        Array.isArray(publicProducts?.products) &&
          !publicProducts.products.some((p) => p.id === productId),
      );

      const hiddenOrder = await fetch(BASE + "/api/orders", {
        method: "POST",
        headers: ORIGIN,
        body: JSON.stringify({
          customerName: "Smoke",
          customerPhone: "50370009999",
          delivery: "retiro",
          payment: "efectivo",
          items: [{ productId, quantity: 1 }],
        }),
      }).catch(() => null);
      check("producto oculto no admite pedidos", hiddenOrder?.status === 409);

      const showResponse = await fetch(`${BASE}/api/products/${productId}`, {
        method: "PATCH",
        headers: authH,
        body: JSON.stringify({ isHidden: false }),
      }).catch(() => null);
      const shownProduct = await showResponse?.json().catch(() => null);
      check("volver a mostrar producto", showResponse?.ok && shownProduct?.product?.isHidden === false);
    }

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
