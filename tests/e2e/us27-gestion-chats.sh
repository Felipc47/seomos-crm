#!/bin/bash
# Self-test de COMPORTAMIENTO — gestión y moderación de chats (014).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%s)"

echo "── Reset de BD y mocks"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && pnpm db:migrate >/dev/null 2>&1)
curl -s -X DELETE "$BASE/api/dev/wa-mock/outbox" >/dev/null

echo "── API + Chrome: eliminación, bloqueo y reporte"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_TS="$TS" node <<'JS'
const { chromium, request } = require("playwright");
const postgres = require("postgres");

const baseURL = process.env.E2E_BASE;
const stamp = process.env.E2E_TS;
const password = "Password123!";
const token = "EAAtest-valido";
const phoneNumberId = `phone_moderation_${stamp}`;
const sql = postgres("postgres://postgres:postgres@localhost:5433/vocero", {
  max: 1,
});
let passed = 0;
let browser = null;
let context = null;
let publicApi = null;

function ok(message) {
  passed += 1;
  console.log(`  ✅ ${message}`);
}

function assert(condition, message, detail = "") {
  if (!condition) throw new Error(`${message}${detail ? ` — ${detail}` : ""}`);
  ok(message);
}

async function body(response) {
  return response.json().catch(() => ({}));
}

async function waitFor(check, message, timeout = 12000) {
  const deadline = Date.now() + timeout;
  let value = null;
  while (Date.now() < deadline) {
    value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${message}${value ? ` — ${JSON.stringify(value)}` : ""}`);
}

async function conversations(session) {
  const response = await session.get("/api/conversations");
  assert(response.ok(), "Bandeja responde", `${response.status()}`);
  return (await response.json()).conversations;
}

async function inbound(phone, name, suffix = "first", targetPhoneId = phoneNumberId) {
  const response = await publicApi.post("/api/dev/wa-mock/inbound", {
    data: {
      phoneNumberId: targetPhoneId,
      from: phone,
      name,
      text: `Mensaje ${suffix} de ${name}`,
      waMessageId: `wamid.us27.${stamp}.${phone}.${suffix}`,
    },
  });
  assert(response.ok(), `entrante procesado: ${name}`, `${response.status()}`);
}

async function conversationByPhone(session, phone) {
  return waitFor(async () => {
    const all = await conversations(session);
    return all.find((item) => item.contact.phone === phone) ?? null;
  }, `No apareció la conversación ${phone}`);
}

async function outboxTo(phone) {
  const response = await publicApi.get("/api/dev/wa-mock/outbox");
  const entries = (await response.json()).outbox ?? [];
  return entries.filter((entry) => entry.to === phone).length;
}

async function failNextBlock(mode = "delivery") {
  const response = await publicApi.post("/api/dev/wa-mock/fail-next", {
    data: { target: "block", count: 1, mode },
  });
  assert(response.ok(), "fallo de block_users preparado");
}

async function blockedUsers(session, targetPhoneId = phoneNumberId) {
  const response = await session.get(
    `/api/dev/wa-mock/graph/v25.0/${targetPhoneId}/block_users`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  assert(response.ok(), "lista mock de bloqueados responde");
  return (await response.json()).data ?? [];
}

(async () => {
  publicApi = await request.newContext({ baseURL });
  const ownerEmail = `owner-moderation-${stamp}@test.local`;
  const owner = await request.newContext({ baseURL });
  const signup = await owner.post("/api/auth/sign-up/email", {
    data: { name: "Admin Moderación", email: ownerEmail, password },
  });
  assert(signup.ok(), "organización creada", `${signup.status()}`);

  const whatsapp = await owner.put("/api/settings/whatsapp", {
    data: {
      wabaId: `waba_moderation_${stamp}`,
      phoneNumberId,
      token,
    },
  });
  assert(whatsapp.ok(), "WhatsApp mock conectado", `${whatsapp.status()}`);

  const phones = {
    deleteOne: "573200027001",
    deleteBulkA: "573200027002",
    deleteBulkB: "573200027003",
    block: "573200027004",
    failBlock: "573200027005",
    report: "573200027006",
    uiOne: "573200027007",
    uiTwo: "573200027008",
    uiThree: "573200027009",
  };

  for (const [key, phone] of Object.entries(phones)) {
    await inbound(phone, key, "first");
  }

  const deleteOne = await conversationByPhone(owner, phones.deleteOne);
  const [beforeDelete] = await sql`
    select
      (select count(*)::int from contact where id = ${deleteOne.contact.id}) as contacts,
      (select count(*)::int from lead where contact_id = ${deleteOne.contact.id}) as leads,
      (select count(*)::int from message where conversation_id = ${deleteOne.id}) as messages
  `;
  assert(beforeDelete.messages === 1, "el chat individual tiene historial");

  const deleteResponse = await owner.delete(`/api/conversations/${deleteOne.id}`);
  assert(deleteResponse.ok(), "eliminación individual responde ok");
  const [afterDelete] = await sql`
    select
      (select count(*)::int from conversation where id = ${deleteOne.id}) as conversations,
      (select count(*)::int from contact where id = ${deleteOne.contact.id}) as contacts,
      (select count(*)::int from lead where contact_id = ${deleteOne.contact.id}) as leads,
      (select count(*)::int from message where conversation_id = ${deleteOne.id}) as messages
  `;
  assert(
    afterDelete.conversations === 0 && afterDelete.messages === 0,
    "eliminar chat borra conversación e historial"
  );
  assert(
    afterDelete.contacts === 1 && afterDelete.leads === 1,
    "eliminar chat conserva contacto y prospecto"
  );

  await inbound(phones.deleteOne, "deleteOne", "reopen");
  const reopened = await conversationByPhone(owner, phones.deleteOne);
  assert(reopened.id !== deleteOne.id, "un entrante recrea una conversación nueva");
  assert(reopened.contact.id === deleteOne.contact.id, "el reingreso reutiliza el contacto");
  const [reopenCounts] = await sql`
    select
      (select count(*)::int from contact where phone = ${phones.deleteOne}) as contacts,
      (select count(*)::int from lead l join contact c on c.id=l.contact_id where c.phone = ${phones.deleteOne}) as leads
  `;
  assert(
    reopenCounts.contacts === 1 && reopenCounts.leads === 1,
    "el reingreso no duplica contacto ni lead"
  );

  const bulkA = await conversationByPhone(owner, phones.deleteBulkA);
  const bulkB = await conversationByPhone(owner, phones.deleteBulkB);
  const bulkDelete = await owner.post("/api/conversations/bulk", {
    data: {
      action: "delete",
      conversationIds: [bulkA.id, bulkB.id, bulkA.id],
    },
  });
  const bulkDeleteBody = await body(bulkDelete);
  assert(
    bulkDelete.ok() && bulkDeleteBody.affected === 2,
    "eliminación masiva deduplica y afecta solo seleccionados",
    JSON.stringify(bulkDeleteBody)
  );

  const tooMany = await owner.post("/api/conversations/bulk", {
    data: {
      action: "delete",
      conversationIds: Array.from({ length: 101 }, (_, index) => `cv_${index}`),
    },
  });
  assert(tooMany.status() === 422, "un lote mayor de 100 se rechaza");

  const foreignEmail = `foreign-moderation-${stamp}@test.local`;
  const foreignCompany = await owner.post("/api/admin/companies", {
    data: {
      companyName: "Moderación Ajena",
      adminName: "Admin Ajeno",
      adminEmail: foreignEmail,
      adminPassword: password,
    },
  });
  assert(foreignCompany.ok(), "segunda organización creada");
  const foreign = await request.newContext({ baseURL });
  const foreignLogin = await foreign.post("/api/auth/sign-in/email", {
    data: { email: foreignEmail, password },
  });
  assert(foreignLogin.ok(), "sesión de organización ajena");
  const foreignPhoneId = `phone_foreign_${stamp}`;
  const foreignWhatsapp = await foreign.put("/api/settings/whatsapp", {
    data: {
      wabaId: `waba_foreign_${stamp}`,
      phoneNumberId: foreignPhoneId,
      token,
    },
  });
  assert(foreignWhatsapp.ok(), "WhatsApp ajeno conectado");
  await inbound("573200027099", "Ajeno", "first", foreignPhoneId);
  const foreignConversation = await conversationByPhone(foreign, "573200027099");
  const crossTenant = await owner.post("/api/conversations/bulk", {
    data: { action: "delete", conversationIds: [foreignConversation.id] },
  });
  assert(crossTenant.status() === 404, "un ID de otro tenant no se puede operar");
  assert(
    Boolean(await conversationByPhone(foreign, "573200027099")),
    "el chat ajeno permanece intacto"
  );

  const blockConversation = await conversationByPhone(owner, phones.block);
  const block = await owner.post("/api/conversations/bulk", {
    data: { action: "block", conversationIds: [blockConversation.id] },
  });
  const blockBody = await body(block);
  assert(
    block.ok() && blockBody.metaSynced === true,
    "bloqueo local y Meta completados",
    JSON.stringify(blockBody)
  );
  const blockedDto = await conversationByPhone(owner, phones.block);
  assert(
    blockedDto.contact.blockedAt && blockedDto.contact.blockSyncStatus === "synced",
    "Bandeja expone bloqueo sincronizado"
  );
  assert(
    (await blockedUsers(owner)).some((entry) => entry.wa_id === phones.block),
    "Meta mock contiene el usuario bloqueado"
  );

  const manualBefore = await outboxTo(phones.block);
  const blockedText = await owner.post(
    `/api/conversations/${blockConversation.id}/messages`,
    { data: { text: "No debe salir" } }
  );
  assert(blockedText.status() === 403, "texto manual bloqueado en servidor");
  const blockedFile = await owner.post(
    `/api/conversations/${blockConversation.id}/messages/attachment`,
    {
      multipart: {
        file: {
          name: "nota.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("no enviar"),
        },
      },
    }
  );
  assert(blockedFile.status() === 403, "archivo bloqueado en servidor");

  const templateCreate = await owner.post("/api/templates", {
    data: {
      name: `moderacion_${stamp}`,
      language: "es_CO",
      category: "UTILITY",
      body: "Hola, mensaje de prueba",
    },
  });
  assert(templateCreate.ok(), "plantilla creada para probar la guardia");
  await publicApi.post("/api/dev/wa-mock/template-status", {
    data: {
      wabaId: `waba_moderation_${stamp}`,
      name: `moderacion_${stamp}`,
      language: "es_CO",
      event: "APPROVED",
    },
  });
  await owner.post("/api/templates/sync");
  const templates = (await (await owner.get("/api/templates")).json()).templates;
  const approved = templates.find((template) => template.name === `moderacion_${stamp}`);
  assert(approved?.status === "approved", "plantilla aprobada en el mock");
  const blockedTemplate = await owner.post(
    `/api/conversations/${blockConversation.id}/messages/template`,
    { data: { templateId: approved.id } }
  );
  assert(blockedTemplate.status() === 403, "plantilla bloqueada en servidor");

  const blockedCampaign = await owner.post("/api/campaigns", {
    data: {
      name: "Solo bloqueado",
      templateId: approved.id,
      variableMode: "none",
      audience: { mode: "manual", contactIds: [blockConversation.contact.id] },
    },
  });
  assert(blockedCampaign.status() === 400, "campaña excluye contactos bloqueados");

  const [qualifying] = await sql`
    select id from pipeline_stage
    where organization_id = (
      select organization_id from contact where id = ${blockConversation.contact.id}
    ) and lower(name) = 'en calificación'
    limit 1
  `;
  await sql`
    update lead set stage_id=${qualifying.id}, follow_up_due_at=date_trunc('milliseconds', now()-interval '1 minute'), follow_up_attempts=0
    where contact_id=${blockConversation.contact.id}
  `;
  await owner.put("/api/settings/follow-up", { data: { enabled: true, templateId: null } });
  const sweep = await publicApi.post("/api/cron/sweep", {
    headers: { authorization: "Bearer e2e-sweep" },
  });
  assert(sweep.ok(), "barrido de seguimiento ejecutado");
  const [afterSweep] = await sql`
    select follow_up_due_at from lead where contact_id=${blockConversation.contact.id}
  `;
  assert(afterSweep.follow_up_due_at === null, "seguimiento se desarma para bloqueados");

  await owner.put("/api/agent/profile", {
    data: { enabled: true, name: "Agente Moderación" },
  });
  await inbound(phones.block, "block", "blocked-inbound");
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert(
    (await outboxTo(phones.block)) === manualBefore,
    "un entrante bloqueado no genera respuesta de IA ni otro envío"
  );

  const failConversation = await conversationByPhone(owner, phones.failBlock);
  await failNextBlock();
  const failedBlock = await owner.post("/api/conversations/bulk", {
    data: { action: "block", conversationIds: [failConversation.id] },
  });
  const failedBlockBody = await body(failedBlock);
  assert(
    failedBlock.ok() && failedBlockBody.metaSynced === false && failedBlockBody.warning,
    "fallo de Meta mantiene bloqueo local con advertencia",
    JSON.stringify(failedBlockBody)
  );
  const failedDto = await conversationByPhone(owner, phones.failBlock);
  assert(
    failedDto.contact.blockedAt && failedDto.contact.blockSyncStatus === "failed",
    "sincronización fallida queda visible y protegida"
  );
  const failSend = await owner.post(
    `/api/conversations/${failConversation.id}/messages`,
    { data: { text: "Tampoco debe salir" } }
  );
  assert(failSend.status() === 403, "bloqueo local protege aunque Meta falle");

  const retryBlock = await owner.post("/api/conversations/bulk", {
    data: { action: "block", conversationIds: [failConversation.id] },
  });
  const retryBlockBody = await body(retryBlock);
  assert(
    retryBlock.ok() && retryBlockBody.metaSynced === true,
    "el bloqueo fallido se puede reintentar hasta sincronizar"
  );

  await failNextBlock();
  const failedUnblock = await owner.post("/api/conversations/bulk", {
    data: { action: "unblock", conversationIds: [failConversation.id] },
  });
  assert(failedUnblock.status() === 502, "fallo al desbloquear se informa");
  const stillBlocked = await conversationByPhone(owner, phones.failBlock);
  assert(stillBlocked.contact.blockedAt, "fallo remoto conserva bloqueo local");
  const successfulUnblock = await owner.post("/api/conversations/bulk", {
    data: { action: "unblock", conversationIds: [failConversation.id] },
  });
  assert(successfulUnblock.ok(), "desbloqueo exitoso completa la transición");
  const unblockedDto = await conversationByPhone(owner, phones.failBlock);
  assert(!unblockedDto.contact.blockedAt, "Bandeja refleja contacto desbloqueado");

  const reportConversation = await conversationByPhone(owner, phones.report);
  const report = await owner.post("/api/conversations/bulk", {
    data: {
      action: "report",
      conversationIds: [reportConversation.id],
      reason: "fraud",
      notes: "Solicitó datos financieros sospechosos",
    },
  });
  const reportBody = await body(report);
  assert(
    report.ok() && reportBody.scope === "internal",
    "reporte se identifica como interno"
  );
  const [reportRow] = await sql`
    select cr.reason, cr.notes, cr.reported_by_user_id, u.email
    from contact_report cr
    left join "user" u on u.id=cr.reported_by_user_id
    where cr.contact_id=${reportConversation.contact.id}
    order by cr.created_at desc limit 1
  `;
  assert(
    reportRow.reason === "fraud" &&
      reportRow.notes.includes("financieros") &&
      reportRow.email === ownerEmail,
    "reporte conserva motivo, notas y actor"
  );
  const reportedDto = await conversationByPhone(owner, phones.report);
  assert(
    reportedDto.contact.reportReason === "fraud" &&
      reportedDto.contact.reportedAt &&
      !reportedDto.contact.blockedAt,
    "reportar muestra indicador sin bloquear"
  );

  browser = await chromium.launch({ channel: "chrome", headless: true });
  context = await browser.newContext({
    storageState: await owner.storageState(),
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto(`${baseURL}/inbox`);
  await page.getByRole("heading", { name: "Bandeja" }).waitFor();
  await page.getByRole("button", { name: "Seleccionar" }).click();
  const uiOneRow = page.getByRole("button").filter({ hasText: "uiOne" }).first();
  const uiTwoRow = page.getByRole("button").filter({ hasText: "uiTwo" }).first();
  await uiOneRow.click();
  await uiTwoRow.click();
  await page.getByText("2 seleccionados", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Reportar" }).click();
  const reportDialog = page.getByRole("alertdialog", { name: "Reportar 2 contactos" });
  await reportDialog.waitFor();
  await reportDialog.getByRole("combobox").selectOption("spam");
  await reportDialog.getByPlaceholder("Agrega contexto para el equipo…").fill("Selección masiva UI");
  await reportDialog.getByRole("button", { name: "Reportar 2 contactos" }).click();
  await page.getByRole("status").filter({ hasText: "2 reportes internos" }).waitFor();
  ok("selección masiva y diálogo de reporte funcionan en la UI");

  const uiThreeOptions = page.getByRole("button", { name: "Opciones del chat con uiThree" });
  await uiThreeOptions.click();
  await page.getByRole("button", { name: "Eliminar chat", exact: true }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Eliminar chat" });
  await deleteDialog.waitFor();
  await deleteDialog.getByRole("button", { name: "Cancelar" }).click();
  await uiThreeOptions.click();
  await page.getByRole("button", { name: "Eliminar chat", exact: true }).click();
  await page.getByRole("button", { name: "Sí, eliminar chat" }).click();
  await page.getByRole("status").filter({ hasText: "Chat eliminado" }).waitFor();
  assert(
    (await page.getByRole("button", { name: "Opciones del chat con uiThree" }).count()) === 0,
    "cancelación conserva y confirmación elimina el chat desde UI"
  );

  const uiOneOptions = page.getByRole("button", { name: "Opciones del chat con uiOne" });
  await uiOneOptions.click();
  await page.getByRole("button", { name: "Bloquear", exact: true }).click();
  await page.getByRole("button", { name: "Bloquear contacto", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Contacto bloqueado" }).waitFor();
  await page.getByRole("button").filter({ hasText: "uiOne" }).first().click();
  await page.getByText("La IA, mensajes, plantillas, campañas y seguimientos no pueden escribirle.").waitFor();
  ok("menú individual bloquea y reemplaza el compositor");

  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${baseURL}/inbox`);
    await page.getByRole("heading", { name: "Bandeja" }).waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    assert(!overflow, `Bandeja sin overflow a ${width}px`);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}/inbox`);
  await page.getByRole("button", { name: "Seleccionar" }).focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("inbox-bulk-actions").waitFor();
  await page.keyboard.press("Escape");
  assert(browserErrors.length === 0, "navegador sin errores", browserErrors.join("\n"));

  await context.close();
  await browser.close();
  await foreign.dispose();
  await owner.dispose();
  await publicApi.dispose();
  await sql.end();
  console.log(`\n═══ RESULTADO: ${passed} verificaciones ok ═══`);
})().catch(async (error) => {
  console.error(error);
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exitCode = 1;
});
JS
)
