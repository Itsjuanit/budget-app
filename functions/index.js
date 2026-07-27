const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const categoryData = require("./categories.json");

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const AUTHORIZED_USERS_COLLECTION = "telegramUsers";
const PENDING_COLLECTION = "telegramPending";

/** Cuánto vive una confirmación pendiente antes de expirar. */
const PENDING_TTL_MS = 60 * 1000;

const TYPE_EMOJI = { income: "💰", expense: "💸", savings: "🏦" };
const TYPE_LABEL = { income: "Ingreso", expense: "Gasto", savings: "Ahorro" };

/**
 * Escapa los caracteres que Telegram interpreta como HTML.
 *
 * Sin esto, una descripción con "<" o "&" (ej: "Bar & Co") hacía que la API
 * rechazara el mensaje con un 400 y el usuario no recibía ninguna respuesta.
 */
function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Los alias y las categorías vienen de shared/categories.json (fuente única
// compartida con la app). functions/categories.json es una copia generada por
// `npm run sync:categories`, que corre automáticamente en el predeploy.
const CATEGORY_ALIASES = categoryData.aliases;

// Todo lo que no sea ingreso o ahorro se trata como gasto.
const CATEGORY_TYPE_MAP = Object.fromEntries([
  ...categoryData.income.map((c) => [c.value, "income"]),
  ...categoryData.savings.map((c) => [c.value, "savings"]),
]);

// Set de todos los identificadores válidos por defecto, para rechazar categorías inventadas.
const KNOWN_CATEGORY_VALUES = new Set(
  [...categoryData.income, ...categoryData.savings, ...categoryData.expense].map((c) => c.value)
);

// Labels legibles por identificador (ej: "disney-plus" -> "Disney+").
const CATEGORY_LABELS = Object.fromEntries(
  [...categoryData.income, ...categoryData.savings, ...categoryData.expense].map((c) => [
    c.value,
    c.label,
  ])
);

/**
 * Llama a la API de Telegram y verifica la respuesta.
 *
 * Antes ninguna de estas llamadas miraba el resultado: si Telegram rechazaba el
 * mensaje (HTML inválido, chat bloqueado) fallaba en silencio y el usuario se
 * quedaba sin respuesta y sin pista de por qué.
 */
async function callTelegram(method, payload) {
  const response = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(
      `Telegram ${method} falló (${response.status}): ${result?.description || "sin detalle"}`
    );
  }
  return result;
}

async function sendMessage(chatId, text, options = {}) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...options,
  });
}

async function editMessage(chatId, messageId, text) {
  return callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
  });
}

async function answerCallback(callbackQueryId) {
  return callTelegram("answerCallbackQuery", { callback_query_id: callbackQueryId });
}

/** Último recurso: avisar al usuario en texto plano, sin que un fallo acá tire la función. */
async function sendPlainError(chatId, text) {
  try {
    await callTelegram("sendMessage", { chat_id: chatId, text });
  } catch (error) {
    console.error("No se pudo avisar del error al usuario:", error);
  }
}

async function getFirebaseUid(chatId) {
  const d = await db.collection(AUTHORIZED_USERS_COLLECTION).doc(String(chatId)).get();
  return d.exists ? d.data().firebaseUid : null;
}

function getCurrentMonthYear() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getCategoryLabel(value, customLabels = {}) {
  return (
    CATEGORY_LABELS[value] ||
    customLabels[value] ||
    value.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

/**
 * Resuelve el texto que escribió el usuario a una categoría existente.
 *
 * Devuelve null si no la reconoce: antes se usaba el texto crudo como categoría,
 * lo que creaba categorías fantasma que después aparecían en gris en la app.
 */
async function resolveCategory(input, firebaseUid) {
  const normalized = input.toLowerCase().trim();

  const aliased = CATEGORY_ALIASES[normalized];
  if (aliased) {
    return { category: aliased, type: CATEGORY_TYPE_MAP[aliased] || "expense" };
  }

  if (KNOWN_CATEGORY_VALUES.has(normalized)) {
    return { category: normalized, type: CATEGORY_TYPE_MAP[normalized] || "expense" };
  }

  const snap = await db.collection("customCategories").where("userId", "==", firebaseUid).get();
  let match = null;
  snap.forEach((doc) => {
    const d = doc.data();
    if (d.label.toLowerCase() === normalized || d.value.toLowerCase() === normalized) {
      match = { category: d.value, type: d.type || "expense" };
    }
  });

  return match;
}

async function fetchDolarRate(type = "cripto") {
  const endpoints = { cripto: "cripto", blue: "blue", mep: "bolsa", tarjeta: "tarjeta" };
  const r = await fetch(`https://dolarapi.com/v1/dolares/${endpoints[type] || "cripto"}`);
  if (!r.ok) throw new Error("Error obteniendo cotización");
  const data = await r.json();
  return { venta: data.venta, nombre: type.charAt(0).toUpperCase() + type.slice(1) };
}

const MAX_AMOUNT = 1_000_000_000;

/**
 * Interpreta un monto escrito como se escribe en Argentina.
 *   "5000" → 5000 · "5.000" → 5000 · "5.000,50" → 5000.5 · "5,5" → 5.5
 *
 * Antes se usaba parseFloat directo, así que "5.000" se cargaba como $5.
 */
function parseAmount(raw) {
  const text = String(raw).trim();
  if (!/^[\d.,]+$/.test(text)) return null;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let normalized;

  if (lastComma > -1 && lastDot > -1) {
    // El separador decimal es el que aparece último; el otro es de miles.
    normalized =
      lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (lastComma > -1) {
    // Una sola coma: decimal si deja 1-2 dígitos ("5,5"), separador de miles si no.
    normalized = text.length - lastComma - 1 <= 2 ? text.replace(",", ".") : text.replace(/,/g, "");
  } else if (lastDot > -1) {
    normalized = text.length - lastDot - 1 <= 2 ? text : text.replace(/\./g, "");
  } else {
    normalized = text;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) return null;
  return value;
}

async function parseTransaction(text, firebaseUid) {
  let explicitType = null;
  let cleanText = text.trim();

  if (cleanText.startsWith("/gasto ")) {
    explicitType = "expense";
    cleanText = cleanText.slice("/gasto ".length);
  } else if (cleanText.startsWith("/ingreso ")) {
    explicitType = "income";
    cleanText = cleanText.slice("/ingreso ".length);
  } else if (cleanText.startsWith("/ahorro ")) {
    explicitType = "savings";
    cleanText = cleanText.slice("/ahorro ".length);
  } else if (/^\d/.test(cleanText)) {
    explicitType = "expense";
  } else {
    return null;
  }

  const parts = cleanText.trim().split(/\s+/);
  if (parts.length < 2) return null;

  const amountStr = parts[0];
  const usdMatch = amountStr.match(/^([\d.,]+)(usd|dolar|dolares|dol)$/i);

  if (usdMatch) {
    const usdAmount = parseAmount(usdMatch[1]);
    if (usdAmount === null) return null;

    const dolarTypes = ["cripto", "blue", "mep", "tarjeta"];
    let dolarType = "cripto";
    let catStart = 1;

    if (parts.length >= 3 && dolarTypes.includes(parts[1].toLowerCase())) {
      dolarType = parts[1].toLowerCase();
      catStart = 2;
    }

    if (parts.length <= catStart) return null;

    let rate;
    try {
      rate = await fetchDolarRate(dolarType);
    } catch (error) {
      console.error("Error obteniendo cotización:", error);
      return { error: "No pude obtener la cotización del dólar. Intentá de nuevo." };
    }

    const resolved = await resolveCategory(parts[catStart], firebaseUid);
    if (!resolved) return { unknownCategory: parts[catStart] };

    const arsAmount = Math.round(usdAmount * rate.venta);
    return {
      type: explicitType || resolved.type,
      amount: arsAmount,
      category: resolved.category,
      description: parts.slice(catStart + 1).join(" ") || getCategoryLabel(resolved.category),
      usdInfo: { usdAmount, dolarType, rate: rate.venta, arsAmount },
    };
  }

  const amount = parseAmount(amountStr);
  if (amount === null) return null;

  const resolved = await resolveCategory(parts[1], firebaseUid);
  if (!resolved) return { unknownCategory: parts[1] };

  return {
    type: explicitType || resolved.type,
    amount,
    category: resolved.category,
    description: parts.slice(2).join(" ") || getCategoryLabel(resolved.category),
    usdInfo: null,
  };
}

async function handleVincular(chatId, text) {
  const parts = text.split(/\s+/);
  if (parts.length < 2) {
    await sendMessage(
      chatId,
      "🔗 <b>Vincular cuenta</b>\n\nEnviá tu Firebase UID:\n<code>/vincular TU_FIREBASE_UID</code>"
    );
    return;
  }
  await db.collection(AUTHORIZED_USERS_COLLECTION).doc(String(chatId)).set({
    firebaseUid: parts[1],
    chatId,
    linkedAt: new Date().toISOString(),
  });
  await sendMessage(
    chatId,
    `✅ <b>¡Cuenta vinculada!</b>\n\nFirebase UID: <code>${escapeHtml(parts[1])}</code>\nEscribí /help para ver los comandos.`
  );
}

async function handleResumen(chatId, firebaseUid) {
  const monthYear = getCurrentMonthYear();
  const snap = await db
    .collection("transactions")
    .where("userId", "==", firebaseUid)
    .where("monthYear", "==", monthYear)
    .get();

  const customLabels = await getCustomCategoryLabels(firebaseUid);

  let inc = 0,
    exp = 0,
    sav = 0;
  const byCat = {};
  snap.forEach((doc) => {
    const t = doc.data();
    const amount = Number(t.amount) || 0;
    if (t.type === "income") inc += amount;
    else if (t.type === "expense") {
      exp += amount;
      byCat[t.category] = (byCat[t.category] || 0) + amount;
    } else if (t.type === "savings") sav += amount;
  });

  const avail = inc - exp - sav;
  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const rem = dim - now.getDate();
  const daily = rem > 0 ? Math.max(avail / rem, 0) : 0;

  const top = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c, a]) => `  • ${escapeHtml(getCategoryLabel(c, customLabels))}: ${formatCurrency(a)}`)
    .join("\n");

  await sendMessage(
    chatId,
    `📊 <b>Resumen del mes</b>\n\n` +
      `💰 Ingresos: <b>${formatCurrency(inc)}</b>\n💸 Gastos: <b>${formatCurrency(exp)}</b>\n` +
      `🏦 Ahorros: <b>${formatCurrency(sav)}</b>\n${avail >= 0 ? "🟢" : "🔴"} Disponible: <b>${formatCurrency(avail)}</b>\n\n` +
      `📅 Quedan ${rem} días\n💵 Presupuesto diario: <b>${formatCurrency(daily)}</b>/día\n` +
      (top ? `\n📈 <b>Top gastos:</b>\n${top}\n` : "") +
      `\n📝 ${snap.size} transacciones este mes`
  );
}

/** Mapa value → label de las categorías propias del usuario. */
async function getCustomCategoryLabels(firebaseUid) {
  const snap = await db.collection("customCategories").where("userId", "==", firebaseUid).get();
  const labels = {};
  snap.forEach((d) => {
    const data = d.data();
    labels[data.value] = data.label;
  });
  return labels;
}

async function handleCategorias(chatId, firebaseUid) {
  const snap = await db.collection("customCategories").where("userId", "==", firebaseUid).get();
  const custom = { expense: [], income: [], savings: [] };
  snap.forEach((d) => {
    const data = d.data();
    if (custom[data.type]) custom[data.type].push(data.label);
  });

  // La lista sale del archivo compartido con la app: antes estaba escrita a mano
  // acá y se desactualizaba en cuanto se tocaba categories.js.
  const section = (emoji, title, defaults, extra) => {
    const lines = defaults.map((c) => `• ${escapeHtml(c.label)}`);
    extra.forEach((label) => lines.push(`• <i>${escapeHtml(label)} (custom)</i>`));
    return `<b>${emoji} ${title}:</b>\n${lines.join("\n")}`;
  };

  const msg = [
    "📋 <b>Categorías</b>",
    "",
    section("💸", "Gastos", categoryData.expense, custom.expense),
    "",
    section("💰", "Ingresos", categoryData.income, custom.income),
    "",
    section("🏦", "Ahorros", categoryData.savings, custom.savings),
    "",
    "<b>Aliases:</b> super, nafta, gym, padel, uber, bondi, bar, luz, gas, agua",
    "",
    "<b>💵 USD:</b> <code>100usd super</code> o <code>100usd tarjeta netflix</code>",
  ].join("\n");

  await sendMessage(chatId, msg);
}

async function handleEliminar(chatId, firebaseUid) {
  const snap = await db
    .collection("transactions")
    .where("userId", "==", firebaseUid)
    .where("monthYear", "==", getCurrentMonthYear())
    .orderBy("date", "desc")
    .limit(1)
    .get();

  if (snap.empty) {
    await sendMessage(chatId, "❌ No hay transacciones este mes.");
    return;
  }

  const doc = snap.docs[0];
  const t = doc.data();
  const customLabels = await getCustomCategoryLabels(firebaseUid);

  await db
    .collection(PENDING_COLLECTION)
    .doc(String(chatId))
    .set({
      action: "delete",
      transactionId: doc.id,
      expiresAt: new Date(Date.now() + PENDING_TTL_MS).toISOString(),
    });

  await sendMessage(
    chatId,
    `🗑 <b>¿Eliminar?</b>\n\n${TYPE_EMOJI[t.type]} ${TYPE_LABEL[t.type]}\n💵 ${formatCurrency(t.amount)}\n📁 ${escapeHtml(getCategoryLabel(t.category, customLabels))}\n📝 ${escapeHtml(t.description)}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Sí, eliminar", callback_data: "delete_confirm" },
            { text: "❌ Cancelar", callback_data: "delete_cancel" },
          ],
        ],
      },
    }
  );
}

async function handleHelp(chatId) {
  await sendMessage(
    chatId,
    `🤖 <b>PagaTodo Bot</b>\n\n` +
      `<b>⚡ Rápido (asume gasto):</b>\n<code>5000 super coto</code>\n<code>2000 nafta ypf</code>\n\n` +
      `<b>💵 En USD:</b>\n<code>100usd super coto</code> (cripto)\n<code>100usd blue super coto</code>\n<code>50usd tarjeta netflix</code>\n\n` +
      `<b>📝 Explícito:</b>\n<code>/gasto 5000 super coto</code>\n<code>/ingreso 3000 salario mes</code>\n<code>/ahorro 1000 ahorros fondo</code>\n\n` +
      `<b>📊 Comandos:</b>\n/resumen — Resumen del mes\n/categorias — Ver categorías\n/eliminar — Eliminar última\n/vincular — Vincular cuenta\n/help — Esta ayuda\n\n` +
      `<b>Dólares:</b> cripto (default), blue, mep, tarjeta`
  );
}

async function handleTransaction(chatId, firebaseUid, text) {
  const parsed = await parseTransaction(text, firebaseUid);
  if (!parsed) {
    await sendMessage(
      chatId,
      "❌ No pude entender eso.\n\nFormato: <code>5000 super coto</code>\nUSD: <code>100usd super coto</code>\n\n/help para ver comandos."
    );
    return;
  }
  if (parsed.error) {
    await sendMessage(chatId, `❌ ${escapeHtml(parsed.error)}`);
    return;
  }
  if (parsed.unknownCategory) {
    // Antes se guardaba igual usando el texto crudo como categoría, lo que dejaba
    // categorías inexistentes dentro de los datos.
    await sendMessage(
      chatId,
      `❌ No conozco la categoría <b>${escapeHtml(parsed.unknownCategory)}</b>.\n\n` +
        `Mirá /categorias para ver las disponibles, o creala desde la app.`
    );
    return;
  }

  const customLabels = await getCustomCategoryLabels(firebaseUid);

  await db
    .collection(PENDING_COLLECTION)
    .doc(String(chatId))
    .set({
      action: "create",
      transaction: {
        userId: firebaseUid,
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description,
        date: new Date().toISOString(),
        monthYear: getCurrentMonthYear(),
        installments: 0,
        installmentsRemaining: 0,
        source: "telegram",
      },
      usdInfo: parsed.usdInfo || null,
      expiresAt: new Date(Date.now() + PENDING_TTL_MS).toISOString(),
    });

  let msg = `${TYPE_EMOJI[parsed.type]} <b>¿Confirmar ${TYPE_LABEL[parsed.type].toLowerCase()}?</b>\n\n💵 Monto: <b>${formatCurrency(parsed.amount)}</b>\n`;
  if (parsed.usdInfo)
    msg += `💲 USD ${parsed.usdInfo.usdAmount} (${parsed.usdInfo.dolarType} @ $${parsed.usdInfo.rate.toLocaleString("es-AR")})\n`;
  msg += `📁 ${escapeHtml(getCategoryLabel(parsed.category, customLabels))}\n📝 ${escapeHtml(parsed.description)}`;

  await sendMessage(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Confirmar", callback_data: "tx_confirm" },
          { text: "❌ Cancelar", callback_data: "tx_cancel" },
        ],
      ],
    },
  });
}

async function handleCallback(cq) {
  const chatId = cq.message.chat.id;
  const msgId = cq.message.message_id;
  const data = cq.data;

  await answerCallback(cq.id);

  const pDoc = await db.collection(PENDING_COLLECTION).doc(String(chatId)).get();
  if (!pDoc.exists || new Date(pDoc.data().expiresAt) < new Date()) {
    if (pDoc.exists) await db.collection(PENDING_COLLECTION).doc(String(chatId)).delete();
    await editMessage(chatId, msgId, "⏰ Expiró. Intentá de nuevo.");
    return;
  }

  const p = pDoc.data();

  if (data === "tx_confirm" && p.action === "create") {
    const t = p.transaction;
    await db.collection("transactions").add(t);
    await db.collection(PENDING_COLLECTION).doc(String(chatId)).delete();
    const customLabels = await getCustomCategoryLabels(t.userId);
    await editMessage(
      chatId,
      msgId,
      `${TYPE_EMOJI[t.type]} <b>${TYPE_LABEL[t.type]} registrado</b>\n\n💵 <b>${formatCurrency(t.amount)}</b>\n📁 ${escapeHtml(getCategoryLabel(t.category, customLabels))}\n📝 ${escapeHtml(t.description)}\n\n<i>✅ Guardado</i>`
    );
    return;
  }

  if (data === "tx_cancel") {
    await db.collection(PENDING_COLLECTION).doc(String(chatId)).delete();
    await editMessage(chatId, msgId, "❌ Cancelado.");
    return;
  }

  if (data === "delete_confirm" && p.action === "delete") {
    await db.collection("transactions").doc(p.transactionId).delete();
    await db.collection(PENDING_COLLECTION).doc(String(chatId)).delete();
    await editMessage(chatId, msgId, "🗑 <b>Eliminado.</b>");
    return;
  }

  if (data === "delete_cancel") {
    await db.collection(PENDING_COLLECTION).doc(String(chatId)).delete();
    await editMessage(chatId, msgId, "👍 Cancelado.");
    return;
  }
}

/** Enruta un update de Telegram al handler que corresponda. */
async function routeUpdate(update) {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }
  if (!update.message || !update.message.text) return;

  const chatId = update.message.chat.id;
  const text = update.message.text.trim();

  if (text === "/start" || text === "/help") return handleHelp(chatId);
  if (text.startsWith("/vincular")) return handleVincular(chatId, text);

  const firebaseUid = await getFirebaseUid(chatId);
  if (!firebaseUid) {
    return sendMessage(chatId, "🔒 Cuenta no vinculada.\n<code>/vincular TU_UID</code>");
  }

  if (text === "/resumen") return handleResumen(chatId, firebaseUid);
  if (text === "/categorias") return handleCategorias(chatId, firebaseUid);
  if (text === "/eliminar") return handleEliminar(chatId, firebaseUid);

  return handleTransaction(chatId, firebaseUid, text);
}

exports.telegramWebhook = functions.region("us-central1").https.onRequest(async (req, res) => {
  // Se responde siempre 200 para que Telegram no reintente el mismo update en loop.
  try {
    if (req.method !== "POST") {
      res.status(200).send("OK");
      return;
    }

    await routeUpdate(req.body);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error procesando el update de Telegram:", error);

    // Antes el usuario simplemente no recibía nada cuando algo fallaba
    // (por ejemplo, si faltaba un índice de Firestore).
    const chatId = req.body?.message?.chat?.id || req.body?.callback_query?.message?.chat?.id;
    if (chatId) {
      await sendPlainError(chatId, "❌ Ocurrió un error procesando tu mensaje. Intentá de nuevo.");
    }

    res.status(200).send("OK");
  }
});

exports.setupWebhook = functions.region("us-central1").https.onRequest(async (req, res) => {
  const pid = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  const url = `https://us-central1-${pid}.cloudfunctions.net/telegramWebhook`;
  const r = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  res.json({ url, result: await r.json() });
});
