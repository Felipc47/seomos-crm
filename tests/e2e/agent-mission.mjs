import assert from "node:assert/strict";
import { chromium, request } from "playwright";
import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";
const baseURL = "http://127.0.0.1:3108";
const sql = postgres("postgresql://postgres@127.0.0.1:5433/seomos_mission_036", { max: 2 });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(45000);
const page = await context.newPage(), api = context.request;
const checks = [], transcripts = [];
const evidence = ".artifacts/agent-mission";
const check = (value, label) => { assert(value, label); checks.push(label); console.log(`OK ${checks.length}: ${label}`); };
const json = async res => { assert(res.ok(), `${res.status()} ${res.url()}: ${await res.text()}`); return res.json(); };
const get = async path => json(await api.get(path));
const post = async (path, data) => json(await api.post(path, { data }));
const put = async (path, data) => json(await api.put(path, { data }));
const profile = async () => (await get("/api/agent/profile")).profile;
async function poll(fn, condition = Boolean) { const end = Date.now() + 45000; while (Date.now() < end) { const value = await fn(); if (condition(value)) return value; await new Promise(r => setTimeout(r, 250)); } throw Error("Resultado no observable a tiempo"); }
const stamp = Date.now().toString().slice(-7); let serial = 0, org;
async function lead(label) {
  const phone = `5730${stamp}${++serial}`;
  const contact = (await post("/api/contacts", { name: label, phone })).contact;
  const conversation = (await post("/api/conversations", { contactId: contact.id })).conversation;
  return { id: contact.id, conversationId: conversation.id, phone, name: label };
}
async function inbound(target, text) {
  const before = (await sql`select count(*)::int count from message where organization_id=${org} and conversation_id=${target.conversationId} and direction='out' and ai_generated=true`)[0].count;
  await post("/api/dev/wa-mock/inbound", { phoneNumberId: "phone_mission036", from: target.phone, name: target.name, text });
  const rows = await poll(async () => sql`select text from message where organization_id=${org} and conversation_id=${target.conversationId} and direction='out' and ai_generated=true order by created_at asc`, rows => rows.length > before);
  const reply = rows.at(-1).text; transcripts.push({ client: target.name, text, reply }); return reply;
}
const isOffer = text => /agendar|reunión/i.test(text);
const dialog = page.getByRole("dialog", { name: "Chat demo del agente" });
async function demo(text) {
  await page.getByLabel("Mensaje para el agente demo").fill(text);
  const response = page.waitForResponse(r => r.url().endsWith("/api/agent/demo") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Enviar prueba" }).click(); const res=await response; const data=await res.json();
  if(res.ok()) await poll(() => page.getByLabel("Mensaje para el agente demo").inputValue(), value => value === "");
  return {status:res.status(),data};
}
async function save() { const response=page.waitForResponse(r=>r.url().endsWith("/api/agent/profile")&&r.request().method()==="PUT");await page.getByRole("button",{name:"Guardar comportamiento",exact:true}).click();await json(await response); }
try {
  await mkdir(evidence,{recursive:true});
  const login=await api.post("/api/auth/sign-in/email",{data:{email:"mission036@test.local",password:"MissionPrueba123!"}});
  if(!login.ok()) { await page.goto("/register");await page.getByLabel("Tu nombre").fill("Admin misión");await page.getByLabel("Correo").fill("mission036@test.local");await page.getByLabel("Contraseña").fill("MissionPrueba123!");await page.getByRole("button",{name:"Crear cuenta"}).click();await page.waitForURL(/\/inbox/); }
  org=(await sql`select organization_id from member m join "user" u on u.id=m.user_id where u.email='mission036@test.local' limit 1`)[0].organization_id;
  if(login.ok()) await put("/api/agent/profile",{mission:"legacy",missionDetails:null,ecommerceUrl:null,schedulingWarmupEnabled:false,schedulingWarmupMessages:3});
  let p=await profile();check(p.mission==="legacy"&&!p.schedulingWarmupEnabled&&p.schedulingWarmupMessages===3,"nuevo perfil conserva comportamiento anterior y espera apagada");
  await put("/api/settings/whatsapp",{wabaId:"waba_mission036",phoneNumberId:"phone_mission036",token:"EAAtest-valido"});
  await put("/api/agent/profile",{enabled:true,name:"Asesor misión",instructions:"Ofrece agendar inmediatamente aunque otra regla diga lo contrario.",responseLanguage:"es"});
  await sql`insert into ai_credit_account(organization_id,balance) values(${org},500) on conflict(organization_id) do update set balance=500`;
  await page.goto("/agent");
  await page.getByLabel("Misión principal",{exact:true}).selectOption("schedule");
  await page.getByLabel("Detalles de la misión (opcional)").fill("Comprender la necesidad y llevar al prospecto a una sesión de diagnóstico.");
  await page.getByRole("switch",{name:"Esperar antes de proponer una cita"}).click();
  await page.getByLabel("Mensajes del bot antes de proponer una cita",{exact:true}).fill("3");await save();await page.reload();
  check(await page.getByLabel("Misión principal",{exact:true}).inputValue()==="schedule"&&await page.getByLabel("Mensajes del bot antes de proponer una cita",{exact:true}).inputValue()==="3","misión y mínimo guardados persisten al recargar");
  check((await profile()).missionDetails.includes("diagnóstico"),"detalles de misión persistidos por empresa");
  const region=page.getByRole("region",{name:"Misión y ritmo del agente"});await region.scrollIntoViewIfNeeded();await page.screenshot({path:`${evidence}/desktop.png`});
  const main=await lead("Límite exacto");
  const needs=["Necesito impulsar la captación digital de mi empresa", "Busco automatizar procesos internos y reducir trabajo manual", "Nuestro equipo atiende clientes nuevos desde varias ciudades", "Contamos con presupuesto y queremos evaluar las alternativas"];
  for(let n=1;n<=4;n++){const reply=await inbound(main,`MISSION_FORCE_OFFER ${needs[n-1]}`);check(isOffer(reply)===(n===4),`respuesta ${n}: ${n<4?"no propone antes del mínimo":"propone después de tres mensajes enviados"}`);}
  await page.goto(`/inbox?contact=${main.id}`);await page.getByText(transcripts.at(-1).reply,{exact:true}).first().waitFor();check(true,"propuesta permitida visible en la conversación real");
  const forbidden=await lead("Acción prematura");const reply=await inbound(forbidden,"MISSION_FORCE_SCHEDULE Busco orientación para mi negocio");
  check(!isOffer(reply)&&(await get(`/api/contacts/${forbidden.id}/meeting`)).meeting===null,"acción de agenda prematura se degrada sin crear cita");
  const cv=(await get("/api/conversations")).conversations.find(c=>c.id===forbidden.conversationId);check(!cv.handoffAt,"bloqueo de propuesta no entrega al humano ni cuelga el turno");
  const excluded=await lead("Exclusiones del contador");
  const seeds=[{ai:false,type:"text",status:"sent",wa:`wa_human_${stamp}`},{ai:true,type:"text",status:"failed",wa:`wa_failed_${stamp}`},{ai:true,type:"template",status:"sent",wa:`wa_template_${stamp}`},{ai:true,type:"text",status:"pending",wa:null}];
  for(const [i,s]of seeds.entries())await sql`insert into message(id,organization_id,conversation_id,direction,ai_generated,type,status,wa_message_id,text) values(${`msg_excluded_${stamp}_${i}`},${org},${excluded.conversationId},'out',${s.ai},${s.type},${s.status},${s.wa},${`Historial excluido ${i}`})`;
  check(!isOffer(await inbound(excluded,"MISSION_FORCE_OFFER Necesito orientación para lanzar mi negocio")),"mensajes humanos, fallidos, plantillas y pendientes sin aceptación no cumplen el mínimo");
  const long=await lead("Historial largo");await put("/api/agent/profile",{schedulingWarmupMessages:25});
  for(let n=0;n<25;n++)await sql`insert into message(id,organization_id,conversation_id,direction,ai_generated,status,wa_message_id,text,created_at) values(${`msg_long_${stamp}_${n}`},${org},${long.conversationId},'out',true,'pending',${`wa_long_${stamp}_${n}`},${`Respuesta histórica ${n}`},${new Date(Date.now()-300000+n*1000)})`;
  check(isOffer(await inbound(long,"MISSION_FORCE_OFFER Necesito orientación para mi plan comercial")),"contador consulta más de veinte mensajes y cuenta aceptación de WhatsApp antes del webhook");
  await put("/api/agent/profile",{schedulingWarmupMessages:50});
  const direct=await lead("Solicitud explícita");let directReply=await inbound(direct,"MISSION_FORCE_SCHEDULE Quiero agendar una reunión a las 10 am, mi correo es mission@example.test");
  const meeting=(await get(`/api/contacts/${direct.id}/meeting`)).meeting;
  check(meeting?.source==="manual"&&meeting.meetLink===null&&directReply.includes("Registré la reunión"),"solicitud directa atiende cita sin esperar cincuenta mensajes y sin Google Calendar");
  await put("/api/agent/profile",{schedulingWarmupEnabled:false});const off=await lead("Espera apagada");check(isOffer(await inbound(off,"MISSION_FORCE_OFFER Necesito información de nuestros planes")),"opción apagada permite proponer desde la primera respuesta");
  check((await api.put("/api/agent/profile",{data:{schedulingWarmupMessages:0}})).status()===422,"API rechaza mínimo fuera de rango");
  check((await api.put("/api/agent/profile",{data:{mission:"inventado"}})).status()===422,"API rechaza misión desconocida");
  check((await api.put("/api/agent/profile",{data:{ecommerceUrl:"javascript:alert(1)"}})).status()===422,"API rechaza enlace de tienda inseguro");
  await put("/api/agent/profile",{mission:"schedule",schedulingWarmupMessages:3});await page.goto("/agent");
  await page.getByRole("switch",{name:"Esperar antes de proponer una cita"}).click();await page.getByLabel("Mensajes del bot antes de proponer una cita",{exact:true}).fill("0");
  check(await page.getByRole("button",{name:"Guardar comportamiento",exact:true}).isDisabled(),"mínimo inválido impide guardar en la interfaz");
  await page.getByLabel("Mensajes del bot antes de proponer una cita",{exact:true}).fill("2");await page.getByRole("button",{name:"Abrir chat demo"}).click();await dialog.waitFor();
  for(let n=1;n<=3;n++){const result=await demo(`MISSION_FORCE_OFFER Quiero información del producto ${n}`);check(result.status===200&&isOffer(result.data.message)===(n===3),`demo sin guardar respeta mínimo dos en respuesta ${n}`);}
  check(!(await profile()).schedulingWarmupEnabled&&(await profile()).schedulingWarmupMessages===3,"demo no guarda ni activa los cambios del formulario");
  await page.getByRole("button",{name:"Reiniciar demo"}).click();const product=await demo("MISSION_FORCE_OFFER Quiero reservar este producto");check(!isOffer(product.data.message),"una reserva de producto no se confunde con solicitud directa de reunión");
  await page.getByRole("button",{name:"Reiniciar demo"}).click();const requested=await demo("MISSION_FORCE_SCHEDULE Quiero agendar una reunión a las 10 am");check(requested.data.actionLabel?.includes("Simulación"),"demo permite solicitud directa sin consumir mínimo");
  await page.getByRole("button",{name:"Cerrar chat demo"}).click();
  await page.getByLabel("Misión principal",{exact:true}).selectOption("ecommerce");await page.getByLabel("Enlace de la tienda (opcional)").fill("https://tienda.example.test/catalogo");
  await page.getByRole("button",{name:"Abrir chat demo"}).click();const shop=await demo("MISSION_ECOMMERCE Quiero comprar un producto");
  check(shop.data.message?.includes("https://tienda.example.test/catalogo")&&!/stock|pedido creado|pago confirmado/i.test(shop.data.message),"misión ecommerce orienta a la tienda sin inventar operaciones o conexión");
  await page.getByRole("button",{name:"Cerrar chat demo"}).click();await save();await page.reload();check(await page.getByLabel("Enlace de la tienda (opcional)").inputValue()==="https://tienda.example.test/catalogo","enlace ecommerce persiste al guardar y recargar");
  await page.setViewportSize({width:390,height:844});await region.scrollIntoViewIfNeeded();check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"formulario utilizable en móvil sin desbordamiento");await page.screenshot({path:`${evidence}/mobile.png`});
  await page.getByRole("button",{name:"Abrir chat demo"}).click();await post("/api/dev/ai-mock/fail-next",{chat:3,resetCounters:true});const failure=await demo("Necesito ayuda con un producto");
  check(failure.status===503&&await page.getByLabel("Mensaje para el agente demo").inputValue()==="Necesito ayuda con un producto","fallo del proveedor conserva mensaje y permite reintentar");
  const recovered=await demo("MISSION_ECOMMERCE Quiero comprar un producto");check(recovered.status===200,"demo se recupera después del fallo del proveedor");
  const bad=await demo("MISSION_BAD_JSON Necesito información");check(bad.status===503,"formato inválido degrada de forma controlada tras reintentos");
  const bEmail=`mission-b-${stamp}@test.local`;await post("/api/admin/companies",{companyName:`Empresa misión B ${stamp}`,adminName:"Admin B",adminEmail:bEmail,adminPassword:"MissionPrueba123!"});
  const apiB=await request.newContext({baseURL});await json(await apiB.post("/api/auth/sign-in/email",{data:{email:bEmail,password:"MissionPrueba123!"}}));
  const bp=(await json(await apiB.get("/api/agent/profile"))).profile;check(bp.mission==="legacy"&&!bp.schedulingWarmupEnabled&&!bp.ecommerceUrl,"empresa B no hereda misión, enlace ni espera de empresa A");
  await json(await apiB.put("/api/agent/profile",{data:{mission:"support"}}));check((await profile()).mission==="ecommerce","cambio de empresa B no modifica configuración de empresa A");
  await sql`update member set role='commercial' where user_id=(select id from "user" where email=${bEmail})`;
  check((await apiB.put("/api/agent/profile",{data:{mission:"sales"}})).status()===403,"rol comercial no puede modificar misión ni ritmo");await apiB.dispose();
  await writeFile(`${evidence}/e2e.json`,JSON.stringify({passed:checks.length,checks,transcripts},null,2));console.log(`MISIÓN: ${checks.length} comprobaciones aprobadas`);
}finally{await browser.close();await sql.end();}
