#!/bin/bash
# Self-test de COMPORTAMIENTO — filtro y transferencia de chats (015).
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
TS="$(date +%s)"

echo "── Reset de BD y mocks"
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d vocero -q \
  -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
(cd "$REPO" && pnpm db:migrate >/dev/null 2>&1)
curl -s -X DELETE "$BASE/api/dev/wa-mock/outbox" >/dev/null

echo "── API + dos sesiones Chrome: filtro, transferencia e historial"
(
  cd "$REPO"
  E2E_BASE="$BASE" E2E_TS="$TS" node <<'JS'
const { chromium, request } = require("playwright");
const postgres = require("postgres");

const baseURL = process.env.E2E_BASE;
const stamp = process.env.E2E_TS;
const password = "Password123!";
const token = "EAAtest-valido";
const phoneNumberId = `phone_assignment_${stamp}`;
const sql = postgres("postgres://postgres:postgres@localhost:5433/vocero", { max: 1 });
let passed = 0;
let browser = null;
const browserErrors = [];

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

async function waitFor(check, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let value = null;
  while (Date.now() < deadline) {
    value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${message}${value ? ` — ${JSON.stringify(value)}` : ""}`);
}

async function chooseInboxFilter(page, ariaLabel, optionLabel) {
  const trigger = page.getByRole("button", { name: ariaLabel, exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: ariaLabel, exact: true });
  await menu.waitFor();
  await menu
    .getByRole("menuitemradio", { name: optionLabel, exact: true })
    .click();
}

async function listConversations(session) {
  const response = await session.get("/api/conversations");
  assert(response.ok(), "Bandeja responde", `${response.status()}`);
  return (await response.json()).conversations;
}

async function inbound(publicApi, phone, name, suffix, extra = {}) {
  const response = await publicApi.post("/api/dev/wa-mock/inbound", {
    data: {
      phoneNumberId,
      from: phone,
      name,
      text: `Mensaje ${suffix} de ${name}`,
      waMessageId: `wamid.us28.${stamp}.${phone}.${suffix}`,
      ...extra,
    },
  });
  assert(response.ok(), `entrante procesado: ${name} ${suffix}`, `${response.status()}`);
}

async function byPhone(session, phone) {
  return waitFor(async () => {
    const rows = await listConversations(session);
    return rows.find((row) => row.contact.phone === phone) ?? null;
  }, `No apareció la conversación ${phone}`);
}

function watchPage(page) {
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
}

(async () => {
  const publicApi = await request.newContext({ baseURL });
  const owner = await request.newContext({ baseURL });
  const ownerEmail = `owner-assignment-${stamp}@test.local`;
  const teammateEmail = `mate-assignment-${stamp}@test.local`;
  const foreignEmail = `foreign-assignment-${stamp}@test.local`;

  const signup = await owner.post("/api/auth/sign-up/email", {
    data: { name: "Ana Propietaria", email: ownerEmail, password },
  });
  assert(signup.ok(), "empresa principal creada", `${signup.status()}`);
  const whatsapp = await owner.put("/api/settings/whatsapp", {
    data: { wabaId: `waba_assignment_${stamp}`, phoneNumberId, token },
  });
  assert(whatsapp.ok(), "WhatsApp mock conectado", `${whatsapp.status()}`);
  const disableAi = await owner.put("/api/agent/profile", {
    data: { enabled: false, name: "Ana" },
  });
  assert(disableAi.ok(), "IA apagada para historial determinista");

  const createMate = await owner.post("/api/settings/team", {
    data: {
      name: "Bruno Comercial",
      email: teammateEmail,
      password,
      role: "commercial",
    },
  });
  assert(createMate.ok(), "compañero creado", `${createMate.status()}`);
  const teammate = await request.newContext({ baseURL });
  const teammateLogin = await teammate.post("/api/auth/sign-in/email", {
    data: { email: teammateEmail, password },
  });
  assert(teammateLogin.ok(), "sesión del compañero iniciada");

  const foreignCompany = await owner.post("/api/admin/companies", {
    data: {
      companyName: "Empresa Ajena",
      adminName: "Carla Ajena",
      adminEmail: foreignEmail,
      adminPassword: password,
    },
  });
  assert(foreignCompany.ok(), "empresa ajena creada");
  const foreign = await request.newContext({ baseURL });
  const foreignLogin = await foreign.post("/api/auth/sign-in/email", {
    data: { email: foreignEmail, password },
  });
  assert(foreignLogin.ok(), "sesión ajena iniciada");

  const ownerOptionsResponse = await owner.get("/api/conversations/assignment-options");
  const ownerOptions = await body(ownerOptionsResponse);
  assert(ownerOptionsResponse.ok(), "opciones de asignación responden para owner", JSON.stringify(ownerOptions));
  assert(
    ownerOptions.members.length === 2 &&
      ownerOptions.members.some((member) => member.isCurrent),
    "opciones contienen solo el equipo y marcan al miembro actual"
  );
  const ownerMember = ownerOptions.members.find((member) => member.isCurrent);
  const teammateMember = ownerOptions.members.find((member) => member.name === "Bruno Comercial");
  assert(Boolean(ownerMember && teammateMember), "owner y compañero resolvieron memberId");

  const teammateOptions = await body(
    await teammate.get("/api/conversations/assignment-options")
  );
  assert(
    teammateOptions.currentMemberId === teammateMember.memberId,
    "la identidad del compañero se resuelve por sesión"
  );
  const foreignOptions = await body(
    await foreign.get("/api/conversations/assignment-options")
  );
  const foreignMember = foreignOptions.members.find((member) => member.isCurrent);
  assert(
    foreignOptions.members.length === 1 && foreignMember,
    "la empresa ajena no ve miembros principales"
  );

  const phones = {
    owner: "573300028001",
    teammate: "573300028002",
    unassigned: "573300028003",
    noLead: "573300028004",
  };
  await inbound(publicApi, phones.owner, "Cliente Propio", "uno");
  await inbound(publicApi, phones.owner, "Cliente Propio", "dos");
  const media = await body(
    await publicApi.post("/api/dev/wa-mock/media", {
      data: { text: "contrato de prueba", mime: "application/pdf" },
    })
  );
  assert(Boolean(media.mediaId), "adjunto mock creado");
  await inbound(publicApi, phones.owner, "Cliente Propio", "archivo", {
    type: "document",
    mediaId: media.mediaId,
    mediaMime: "application/pdf",
    mediaFilename: "contrato.pdf",
    text: "Adjunto contrato",
  });
  await inbound(publicApi, phones.teammate, "Cliente Bruno", "uno");
  await inbound(publicApi, phones.unassigned, "Cliente General", "uno");
  await inbound(publicApi, phones.noLead, "Cliente Sin Lead", "uno");

  const ownerChat = await byPhone(owner, phones.owner);
  const teammateChat = await byPhone(owner, phones.teammate);
  const unassignedChat = await byPhone(owner, phones.unassigned);
  const noLeadChat = await byPhone(owner, phones.noLead);
  await sql`
    update lead set assigned_member_id = ${ownerMember.memberId}, updated_at = now()
    where contact_id = ${ownerChat.contact.id}
  `;
  await sql`
    update lead set assigned_member_id = ${teammateMember.memberId}, updated_at = now()
    where contact_id = ${teammateChat.contact.id}
  `;
  await sql`
    update lead set assigned_member_id = null, updated_at = now()
    where contact_id in (${unassignedChat.contact.id}, ${noLeadChat.contact.id})
  `;
  const [differentStage] = await sql`
    select ls.id, ls.name
    from pipeline_stage ls
    join contact c on c.organization_id = ls.organization_id
    where c.id = ${teammateChat.contact.id} and ls.name <> 'Nuevo'
    order by ls.position
    limit 1
  `;
  assert(Boolean(differentStage), "hay una etapa alterna para probar el filtro visual");
  await sql`
    update lead set stage_id = ${differentStage.id}, updated_at = now()
    where contact_id = ${teammateChat.contact.id}
  `;

  const beforeMessagesResponse = await owner.get(
    `/api/conversations/${ownerChat.id}/messages`
  );
  const beforeMessages = (await body(beforeMessagesResponse)).messages;
  assert(
    beforeMessages.length === 3 && beforeMessages.some((message) => message.hasMedia),
    "el chat origen tiene tres mensajes y adjunto"
  );
  const beforeSnapshot = beforeMessages.map((message) => ({
    id: message.id,
    direction: message.direction,
    type: message.type,
    text: message.text,
    status: message.status,
    hasMedia: message.hasMedia,
    mediaFilename: message.mediaFilename,
  }));

  browser = await chromium.launch({ channel: "chrome", headless: true });
  const ownerContext = await browser.newContext({
    storageState: await owner.storageState(),
    viewport: { width: 1440, height: 900 },
  });
  const teammateContext = await browser.newContext({
    storageState: await teammate.storageState(),
    viewport: { width: 1440, height: 900 },
  });
  const ownerPage = await ownerContext.newPage();
  const teammatePage = await teammateContext.newPage();
  watchPage(ownerPage);
  watchPage(teammatePage);

  await ownerPage.goto(`${baseURL}/inbox`);
  const ownerFilter = ownerPage.getByRole("button", {
    name: "Filtrar por responsable",
    exact: true,
  });
  await ownerFilter.waitFor();
  const stageFilterButton = ownerPage.getByRole("button", {
    name: "Filtrar por etapa del lead",
    exact: true,
  });
  const [stageFilterBox, ownerFilterBox] = await Promise.all([
    stageFilterButton.boundingBox(),
    ownerFilter.boundingBox(),
  ]);
  assert(
    stageFilterBox &&
      ownerFilterBox &&
      Math.abs(stageFilterBox.y - ownerFilterBox.y) < 2 &&
      stageFilterBox.height <= 52 &&
      ownerFilterBox.height <= 52,
    "los filtros compactos comparten una sola fila",
    JSON.stringify({ stageFilterBox, ownerFilterBox })
  );
  await ownerFilter.click();
  const ownerFilterMenu = ownerPage.getByRole("menu", {
    name: "Filtrar por responsable",
    exact: true,
  });
  await ownerFilterMenu.waitFor();
  const ownerMineOption = ownerFilterMenu.getByRole("menuitemradio", {
    name: "Asignados a mí",
    exact: true,
  });
  await waitFor(
    () => ownerMineOption.isEnabled(),
    "el filtro personal del owner no quedó disponible"
  );
  await ownerPage.keyboard.press("Escape");
  await ownerFilterMenu.waitFor({ state: "hidden" });
  ok("el menú personalizado cierra con Escape y devuelve el foco");
  await ownerPage
    .getByTestId(`inbox-conversation-${unassignedChat.id}`)
    .getByText("Sin asignar", { exact: true })
    .waitFor();
  ok("cada chat muestra responsable o Sin asignar");
  await chooseInboxFilter(
    ownerPage,
    "Filtrar por etapa del lead",
    "Nuevo"
  );
  assert(
    !(await ownerPage.getByText("Cliente Bruno", { exact: true }).isVisible()),
    "el menú de etapas aplica el filtro"
  );
  await ownerPage.getByRole("button", { name: "Limpiar", exact: true }).click();
  await ownerPage.getByText("Cliente Bruno", { exact: true }).waitFor();
  ok("Limpiar restaura ambos filtros");
  await chooseInboxFilter(
    ownerPage,
    "Filtrar por responsable",
    "Asignados a mí"
  );
  await ownerPage.getByText("Cliente Propio", { exact: true }).waitFor();
  assert(
    !(await ownerPage.getByText("Cliente Bruno", { exact: true }).isVisible()),
    "Asignados a mí oculta chats ajenos"
  );
  const inboxSearch = ownerPage.getByRole("textbox", {
    name: "Buscar conversación",
  });
  await inboxSearch.fill("Bruno");
  await ownerPage.getByText("No hay chats con estos filtros").waitFor();
  ok("búsqueda se combina con Asignados a mí");
  await inboxSearch.fill("");

  await teammatePage.goto(`${baseURL}/inbox`);
  const teammateFilter = teammatePage.getByRole("button", {
    name: "Filtrar por responsable",
    exact: true,
  });
  await teammateFilter.waitFor();
  await teammateFilter.click();
  const teammateMenu = teammatePage.getByRole("menu", {
    name: "Filtrar por responsable",
    exact: true,
  });
  const teammateMineOption = teammateMenu.getByRole("menuitemradio", {
    name: "Asignados a mí",
    exact: true,
  });
  await waitFor(
    () => teammateMineOption.isEnabled(),
    "el filtro personal del compañero no quedó disponible"
  );
  await teammateMineOption.click();
  await teammatePage.getByText("Cliente Bruno", { exact: true }).waitFor();
  assert(
    !(await teammatePage.getByText("Cliente Propio", { exact: true }).isVisible()),
    "la cola del compañero inicia aislada por filtro"
  );

  await ownerPage.getByText("Cliente Propio", { exact: true }).click();
  const transferButton = ownerPage.getByRole("button", { name: "Transferir chat" });
  await transferButton.waitFor();
  await transferButton.click();
  const dialog = ownerPage.getByRole("dialog", { name: "Transferir conversación" });
  await dialog.waitFor();
  await dialog.getByRole("combobox", { name: "Nuevo responsable" }).selectOption(
    teammateMember.memberId
  );
  await dialog.getByRole("button", { name: "Transferir" }).click();
  await ownerPage.getByRole("status").filter({ hasText: "Chat transferido" }).waitFor();
  ok("transferencia completada desde el encabezado del chat");

  await waitFor(async () => {
    const rows = await listConversations(teammate);
    return rows.find(
      (row) =>
        row.id === ownerChat.id &&
        row.assignee?.memberId === teammateMember.memberId
    );
  }, "el nuevo responsable no apareció en la API");
  await teammatePage.getByTestId(`inbox-conversation-${ownerChat.id}`).waitFor();
  ok("el chat aparece en la cola personal destino por SSE");
  await ownerPage
    .getByTestId(`inbox-conversation-${ownerChat.id}`)
    .waitFor({ state: "hidden" });
  ok("el chat sale de la cola personal origen por SSE");

  const afterMessages = (
    await body(await teammate.get(`/api/conversations/${ownerChat.id}/messages`))
  ).messages;
  const afterSnapshot = afterMessages.map((message) => ({
    id: message.id,
    direction: message.direction,
    type: message.type,
    text: message.text,
    status: message.status,
    hasMedia: message.hasMedia,
    mediaFilename: message.mediaFilename,
  }));
  assert(
    JSON.stringify(afterSnapshot) === JSON.stringify(beforeSnapshot),
    "la transferencia conserva exactamente mensajes, orden, estados y adjunto"
  );
  const [identity] = await sql`
    select c.id as conversation_id, c.contact_id, l.service_id, l.stage_id
    from conversation c join lead l on l.contact_id = c.contact_id
    where c.id = ${ownerChat.id}
  `;
  assert(
    identity.conversation_id === ownerChat.id &&
      identity.contact_id === ownerChat.contact.id,
    "chat y contacto conservan identidad"
  );

  const notification = await waitFor(async () => {
    const response = await teammate.get("/api/notifications");
    const data = await body(response);
    return data.notifications?.find(
      (item) =>
        item.type === "conversation_assigned" &&
        item.href === `/inbox?contact=${ownerChat.contact.id}`
    );
  }, "no llegó la notificación de transferencia");
  assert(
    notification.body.includes("Cliente Propio"),
    "el destinatario recibe notificación enlazada con contexto"
  );

  const notificationsBeforeRepeat = (
    await body(await teammate.get("/api/notifications"))
  ).notifications.filter((item) => item.type === "conversation_assigned").length;
  const repeated = await owner.patch(
    `/api/conversations/${ownerChat.id}/assignee`,
    { data: { memberId: teammateMember.memberId } }
  );
  const repeatedBody = await body(repeated);
  assert(repeated.ok() && repeatedBody.changed === false, "repetir destino es idempotente");
  const notificationsAfterRepeat = (
    await body(await teammate.get("/api/notifications"))
  ).notifications.filter((item) => item.type === "conversation_assigned").length;
  assert(
    notificationsAfterRepeat === notificationsBeforeRepeat,
    "idempotencia no duplica notificaciones"
  );

  const unassign = await teammate.patch(
    `/api/conversations/${ownerChat.id}/assignee`,
    { data: { memberId: null } }
  );
  const unassignBody = await body(unassign);
  assert(
    unassign.ok() && unassignBody.conversation.assignee === null,
    "Sin asignar limpia responsable sin borrar el chat"
  );
  const stillMessages = (
    await body(await owner.get(`/api/conversations/${ownerChat.id}/messages`))
  ).messages;
  assert(stillMessages.length === beforeMessages.length, "desasignar conserva historial");

  const foreignTarget = await owner.patch(
    `/api/conversations/${unassignedChat.id}/assignee`,
    { data: { memberId: foreignMember.memberId } }
  );
  assert(foreignTarget.status() === 422, "miembro de otra empresa se rechaza");
  const foreignConversation = await foreign.patch(
    `/api/conversations/${unassignedChat.id}/assignee`,
    { data: { memberId: foreignMember.memberId } }
  );
  assert(foreignConversation.status() === 404, "sesión ajena no puede transferir el chat");
  const missing = await owner.patch("/api/conversations/cv_noexiste/assignee", {
    data: { memberId: ownerMember.memberId },
  });
  assert(missing.status() === 404, "chat inexistente se rechaza");
  const invalid = await owner.patch(
    `/api/conversations/${unassignedChat.id}/assignee`,
    { data: { memberId: "", organizationId: "org_manipulada" } }
  );
  assert(invalid.status() === 422, "body inválido o con campos extra se rechaza");

  await sql`delete from lead where contact_id = ${noLeadChat.contact.id}`;
  const noLeadTransfer = await owner.patch(
    `/api/conversations/${noLeadChat.id}/assignee`,
    { data: { memberId: ownerMember.memberId } }
  );
  const noLeadBody = await body(noLeadTransfer);
  assert(
    noLeadTransfer.ok() &&
      noLeadBody.conversation.id === noLeadChat.id &&
      noLeadBody.conversation.assignee.memberId === ownerMember.memberId,
    "un chat sin prospecto crea el mínimo y conserva conversación"
  );
  const [noLeadCounts] = await sql`
    select
      (select count(*)::int from conversation where id = ${noLeadChat.id}) as conversations,
      (select count(*)::int from contact where id = ${noLeadChat.contact.id}) as contacts,
      (select count(*)::int from lead where contact_id = ${noLeadChat.contact.id}) as leads,
      (select count(*)::int from message where conversation_id = ${noLeadChat.id}) as messages
  `;
  assert(
    noLeadCounts.conversations === 1 &&
      noLeadCounts.contacts === 1 &&
      noLeadCounts.leads === 1 &&
      noLeadCounts.messages === 1,
    "creación mínima no duplica ni pierde entidades"
  );

  await chooseInboxFilter(
    ownerPage,
    "Filtrar por responsable",
    "Todos los responsables"
  );
  for (const width of [375, 768, 1440]) {
    await ownerPage.setViewportSize({ width, height: 900 });
    await ownerPage.goto(`${baseURL}/inbox`);
    const responsiveFilter = ownerPage.getByRole("button", {
      name: "Filtrar por responsable",
      exact: true,
    });
    await responsiveFilter.waitFor();
    await responsiveFilter.click();
    const responsiveMenu = ownerPage.getByRole("menu", {
      name: "Filtrar por responsable",
      exact: true,
    });
    await responsiveMenu.waitFor();
    const menuFits = await responsiveMenu.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    });
    assert(menuFits, `Menú de filtros dentro del viewport a ${width}px`);
    await ownerPage.keyboard.press("Escape");
    await ownerPage.getByTestId(`inbox-conversation-${noLeadChat.id}`).click();
    await ownerPage.getByRole("button", { name: "Transferir chat" }).waitFor();
    const noOverflow = await ownerPage.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    );
    assert(noOverflow, `Bandeja sin overflow horizontal a ${width}px`);
  }
  await ownerPage
    .getByRole("button", {
      name: "Filtrar por responsable",
      exact: true,
    })
    .focus();
  assert(
    await ownerPage
      .getByRole("button", {
        name: "Filtrar por responsable",
        exact: true,
      })
      .evaluate((element) => element === document.activeElement),
    "filtro operable con teclado"
  );
  assert(browserErrors.length === 0, "sin errores de consola o página", browserErrors.join(" | "));

  await ownerContext.close();
  await teammateContext.close();
  await browser.close();
  browser = null;
  await owner.dispose();
  await teammate.dispose();
  await foreign.dispose();
  await publicApi.dispose();
  await sql.end();
  console.log(`\n═══ RESULTADO: ${passed} verificaciones ok · 0 fallos ═══`);
})().catch(async (error) => {
  console.error(`\n❌ ${error.stack || error.message}`);
  if (browser) await browser.close().catch(() => {});
  await sql.end().catch(() => {});
  process.exit(1);
});
JS
)
