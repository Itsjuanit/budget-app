const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const AUTHORIZED_USERS_COLLECTION = "telegramUsers";
const PENDING_COLLECTION = "telegramPending";

const CATEGORY_ALIASES = {
  super: "supermercado",
  supermercado: "supermercado",
  mercado: "supermercado",
  comida: "comida",
  comer: "comida",
  restaurante: "comida",
  salida: "salidas",
  salidas: "salidas",
  bar: "salidas",
  joda: "salidas",
  transporte: "transporte",
  uber: "transporte",
  taxi: "transporte",
  bondi: "transporte",
  nafta: "combustible",
  combustible: "combustible",
  alquiler: "alquiler",
  luz: "servicios",
  gas: "servicios",
  agua: "servicios",
  servicios: "servicios",
  internet: "internet",
  celular: "celulares",
  celulares: "celulares",
  telefono: "celulares",
  spotify: "spotify",
  netflix: "netflix",
  disney: "disney-plus",
  youtube: "youtube-premium",
  ropa: "compras",
  compras: "compras",
  compra: "compras",
  gym: "actividad-fisica",
  gimnasio: "actividad-fisica",
  padel: "actividad-fisica",
  deporte: "actividad-fisica",
  actividad: "actividad-fisica",
  tarjeta: "tarjeta-credito",
  credito: "tarjeta-credito",
  transferencia: "transferencias",
  transferencias: "transferencias",
  circulo: "circulo",
  salud: "salud",
  medico: "salud",
  farmacia: "salud",
  educacion: "educacion",
  curso: "educacion",
  libro: "educacion",
  regalo: "regalos",
  regalos: "regalos",
  prestamo: "prestamos",
  prestamos: "prestamos",
  dibujo: "dibujo",
  hobbies: "hobbies",
  hobby: "hobbies",
  otros: "otros-gastos",
  sueldo: "salario",
  salario: "salario",
  freelance: "freelance",
  extra: "otros-ingresos",
  ahorro: "ahorros",
  ahorros: "ahorros",
  inversion: "inversiones",
  inversiones: "inversiones",
};

const CATEGORY_TYPE_MAP = {
  salario: "income",
  freelance: "income",
  "otros-ingresos": "income",
  ahorros: "savings",
  inversiones: "savings",
};

async function sendMessage(chatId, text, options = {}) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...options }),
  });
}

async function editMessage(chatId, messageId, text) {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" }),
  });
}

async function answerCallback(callbackQueryId) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
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

function getCategoryLabel(value) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

async function resolveCategory(input, firebaseUid) {
  const normalized = input.toLowerCase().trim();
  if (CATEGORY_ALIASES[normalized]) {
    const category = CATEGORY_ALIASES[normalized];
    return { category, type: CATEGORY_TYPE_MAP[category] || "expense" };
  }
  const snap = await db.collection("customCategories").where("userId", "==", firebaseUid).get();
  let match = null;
  snap.forEach((doc) => {
    const d = doc.data();
    if (d.label.toLowerCase() === normalized || d.value.toLowerCase() === normalized) {
      match = { category: d.value, type: d.type };
    }
  });
  return match || { category: normalized, type: "expense" };
}

async function fetchDolarRate(type = "cripto") {
  const endpoints = { cripto: "cripto", blue: "blue", mep: "bolsa", tarjeta: "tarjeta" };
  const r = await fetch(`https://dolarapi.com/v1/dolares/${endpoints[type] || "cripto"}`);
  if (!r.ok) throw new Error("Error obteniendo cotización");
  const data = await r.json();
  return { venta: data.venta, nombre: type.charAt(0).toUpperCase() + type.slice(1) };
}

async function parseTransaction(text, firebaseUid) {
  let explicitType = null;
  let cleanText = text.trim();

  if (cleanText.startsWith("/gasto ")) {
    explicitType = "expense";
    cleanText = cleanText.replace("/gasto ", "");
  } else if (cleanText.startsWith("/ingreso ")) {
    explicitType = "income";
    cleanText = cleanText.replace("/ingreso ", "");
  } else if (cleanText.startsWith("/ahorro ")) {
    explicitType = "savings";
    cleanText = cleanText.replace("/ahorro ", "");
  } else if (/^\d/.test(cleanText)) {
    explicitType = "expense";
  } else {
    return null;
  }

  const parts = cleanText.split(/\s+/);
  if (parts.length < 2) return null;

  const amountStr = parts[0];
  const usdMatch = amountStr.match(/^(\d+(?:\.\d+)?)(usd|USD|dolar|dolares|dol)$/i);

  if (usdMatch) {
    const usdAmount = parseFloat(usdMatch[1]);
    if (isNaN(usdAmount) || usdAmount <= 0) return null;

    const dolarTypes = ["cripto", "blue", "mep", "tarjeta"];
    let dolarType = "cripto";
    let catStart = 1;

    if (parts.length >= 3 && dolarTypes.includes(parts[1].toLowerCase())) {
      dolarType = parts[1].toLowerCase();
      catStart = 2;
    }

    if (parts.length <= catStart) return null;

    try {
      const rate = await fetchDolarRate(dolarType);
      const arsAmount = Math.round(usdAmount * rate.venta);
      const resolved = await resolveCategory(parts[catStart], firebaseUid);
      const description =
        parts.slice(catStart + 1).join(" ") || getCategoryLabel(resolved.category);
      return {
        type: explicitType || resolved.type,
        amount: arsAmount,
        category: resolved.category,
        description,
        usdInfo: { usdAmount, dolarType, rate: rate.venta, arsAmount },
      };
    } catch (e) {
      return { error: "No pude obtener la cotización del dólar. Intentá de nuevo." };
    }
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const resolved = await resolveCategory(parts[1], firebaseUid);
  const description = parts.slice(2).join(" ") || getCategoryLabel(resolved.category);
  return {
    type: explicitType || resolved.type,
    amount,
    category: resolved.category,
    description,
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
    `✅ <b>¡Cuenta vinculada!</b>\n\nFirebase UID: <code>${parts[1]}</code>\nEscribí /help para ver los comandos.`
  );
}

async function handleResumen(chatId, firebaseUid) {
  const monthYear = getCurrentMonthYear();
  const snap = await db
    .collection("transactions")
    .where("userId", "==", firebaseUid)
    .where("monthYear", "==", monthYear)
    .get();

  let inc = 0,
    exp = 0,
    sav = 0;
  const byCat = {};
  snap.forEach((doc) => {
    const t = doc.data();
    if (t.type === "income") inc += t.amount;
    else if (t.type === "expense") {
      exp += t.amount;
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    } else if (t.type === "savings") sav += t.amount;
  });

  const avail = inc - exp - sav;
  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const rem = dim - now.getDate();
  const daily = rem > 0 ? Math.max(avail / rem, 0) : 0;

  const top = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c, a]) => `  • ${getCategoryLabel(c)}: ${formatCurrency(a)}`)
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

async function handleCategorias(chatId, firebaseUid) {
  const gastos = [
    "Actividad física",
    "Alquiler",
    "Celulares",
    "Círculo",
    "Combustible",
    "Comida",
    "Compras",
    "Dibujo",
    "Disney+",
    "Educación",
    "Hobbies",
    "Internet",
    "Netflix",
    "Otros gastos",
    "Préstamos",
    "Regalos",
    "Salidas",
    "Salud",
    "Servicios",
    "Spotify",
    "Supermercado",
    "Tarjeta de crédito",
    "Transferencias",
    "Transporte",
    "YouTube Premium",
  ];
  const ingresos = ["Freelance", "Otros ingresos", "Salario"];
  const ahorros = ["Ahorros", "Inversiones"];

  const cSnap = await db.collection("customCategories").where("userId", "==", firebaseUid).get();
  const custom = { expense: [], income: [], savings: [] };
  cSnap.forEach((d) => {
    const x = d.data();
    if (custom[x.type]) custom[x.type].push(x.label);
  });

  let msg = `📋 <b>Categorías</b>\n\n<b>💸 Gastos:</b>\n${gastos.map((c) => `• ${c}`).join("\n")}`;
  if (custom.expense.length)
    msg += `\n${custom.expense.map((c) => `• <i>${c} (custom)</i>`).join("\n")}`;
  msg += `\n\n<b>💰 Ingresos:</b>\n${ingresos.map((c) => `• ${c}`).join("\n")}`;
  if (custom.income.length)
    msg += `\n${custom.income.map((c) => `• <i>${c} (custom)</i>`).join("\n")}`;
  msg += `\n\n<b>🏦 Ahorros:</b>\n${ahorros.map((c) => `• ${c}`).join("\n")}`;
  if (custom.savings.length)
    msg += `\n${custom.savings.map((c) => `• <i>${c} (custom)</i>`).join("\n")}`;
  msg += `\n\n<b>Aliases:</b> super, nafta, gym, padel, uber, bondi, bar, luz, gas, agua`;
  msg += `\n\n<b>💵 USD:</b> <code>100usd super</code> o <code>100usd tarjeta netflix</code>`;

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
  const emoji = { income: "💰", expense: "💸", savings: "🏦" };
  const label = { income: "Ingreso", expense: "Gasto", savings: "Ahorro" };

  await db
    .collection(PENDING_COLLECTION)
    .doc(String(chatId))
    .set({
      action: "delete",
      transactionId: doc.id,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });

  await sendMessage(
    chatId,
    `🗑 <b>¿Eliminar?</b>\n\n${emoji[t.type]} ${label[t.type]}\n💵 ${formatCurrency(t.amount)}\n📁 ${getCategoryLabel(t.category)}\n📝 ${t.description}`,
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
    await sendMessage(chatId, `❌ ${parsed.error}`);
    return;
  }

  const emoji = { income: "💰", expense: "💸", savings: "🏦" };
  const label = { income: "Ingreso", expense: "Gasto", savings: "Ahorro" };

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
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });

  let msg = `${emoji[parsed.type]} <b>¿Confirmar ${label[parsed.type].toLowerCase()}?</b>\n\n💵 Monto: <b>${formatCurrency(parsed.amount)}</b>\n`;
  if (parsed.usdInfo)
    msg += `💲 USD ${parsed.usdInfo.usdAmount} (${parsed.usdInfo.dolarType} @ $${parsed.usdInfo.rate.toLocaleString("es-AR")})\n`;
  msg += `📁 ${getCategoryLabel(parsed.category)}\n📝 ${parsed.description}`;

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
    await db.collection("transactions").add(p.transaction);
    await db.collection(PENDING_COLLECTION).doc(String(chatId)).delete();
    const t = p.transaction;
    const emoji = { income: "💰", expense: "💸", savings: "🏦" };
    const label = { income: "Ingreso", expense: "Gasto", savings: "Ahorro" };
    await editMessage(
      chatId,
      msgId,
      `${emoji[t.type]} <b>${label[t.type]} registrado</b>\n\n💵 <b>${formatCurrency(t.amount)}</b>\n📁 ${getCategoryLabel(t.category)}\n📝 ${t.description}\n\n<i>✅ Guardado</i>`
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

exports.telegramWebhook = functions.region("us-central1").https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(200).send("OK");
      return;
    }
    const update = req.body;

    if (update.callback_query) {
      await handleCallback(update.callback_query);
      res.status(200).send("OK");
      return;
    }
    if (!update.message || !update.message.text) {
      res.status(200).send("OK");
      return;
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    if (text === "/start" || text === "/help") {
      await handleHelp(chatId);
      res.status(200).send("OK");
      return;
    }
    if (text.startsWith("/vincular")) {
      await handleVincular(chatId, text);
      res.status(200).send("OK");
      return;
    }

    const firebaseUid = await getFirebaseUid(chatId);
    if (!firebaseUid) {
      await sendMessage(chatId, "🔒 Cuenta no vinculada.\n<code>/vincular TU_UID</code>");
      res.status(200).send("OK");
      return;
    }

    if (text === "/resumen") {
      await handleResumen(chatId, firebaseUid);
      res.status(200).send("OK");
      return;
    }
    if (text === "/categorias") {
      await handleCategorias(chatId, firebaseUid);
      res.status(200).send("OK");
      return;
    }
    if (text === "/eliminar") {
      await handleEliminar(chatId, firebaseUid);
      res.status(200).send("OK");
      return;
    }

    await handleTransaction(chatId, firebaseUid, text);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error:", error);
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
