import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const baseURL = process.env.BASE_URL ?? "http://localhost:3104";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(baseURL)) throw Error("Usar solo localhost con mocks");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(45000);
const page = await context.newPage();
let checks = 0; const report = [];
function check(condition, name) { assert(condition, name); console.log(`✅ ${++checks}. ${name}`); }
async function theme(mode) {
  const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  if (dark !== (mode === "dark")) await page.getByRole("button", { name: dark ? "Modo claro" : "Modo oscuro", exact: true }).click();
  await page.waitForFunction(mode => document.documentElement.classList.contains("dark") === (mode === "dark"), mode);
}
async function ready() {
  await page.waitForFunction(() => {
    const main = document.querySelector("main");
    return main && main.querySelector("button,input,a") && ![...main.querySelectorAll("*")].some(e => e.children.length === 0 && /^Cargando[….]*$/.test(e.textContent?.trim() ?? ""));
  });
}
async function audit(name) {
  const result = await page.evaluate(() => {
    const rgb = value => { const match = value.match(/[\d.]+/g); return match ? match.map(Number) : [0,0,0,0]; };
    const luminance = values => values.slice(0,3).map(v=>{const c=v/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const found=[]; const bad=[];
    for (const el of document.body.querySelectorAll("*")) {
      if (!el.getClientRects().length || getComputedStyle(el).visibility === "hidden") continue;
      const hasText = [...el.childNodes].some(node=>node.nodeType===Node.TEXT_NODE && node.textContent.trim());
      if (!hasText && el.tagName.toLowerCase() !== "svg") continue;
      let parent=el,bg;
      while(parent) { const color=rgb(getComputedStyle(parent).backgroundColor); if ((color[3]??1)>.99) { bg=color; break; } parent=parent.parentElement; }
      if(!bg || !(bg[0]>150 && bg[1]>25 && bg[0]>bg[1]*1.4 && bg[1]>bg[2]*1.25)) continue;
      const style=getComputedStyle(el); const fg=rgb(style.color); const label=(el.getAttribute("aria-label")||el.textContent||el.tagName).trim().slice(0,90);
      const alpha=fg[3]??1;const composed=fg.slice(0,3).map((v,i)=>v*alpha+bg[i]*(1-alpha));
      const values=[luminance(bg),luminance(composed)].sort((a,b)=>b-a);const ratio=(values[0]+.05)/(values[1]+.05);
      const item={label,bg:style.backgroundColor,fg:style.color,ratio};found.push(item);
      if(!fg.slice(0,3).every(v=>v>=235) || ratio<4.5) bad.push(item);
    }
    return {found,bad};
  });
  check(result.bad.length === 0, `${name}: ningún texto o icono oscuro sobre naranja (${result.found.length} elementos)`);
  report.push({name,...result}); return result;
}
async function saveSender() {
  await page.goto("/mailing"); await ready();
  await page.getByRole("button", { name: "Remitente y DNS", exact: true }).click();
  await page.getByLabel("Dominio de envío", { exact: true }).fill("contraste.local.test");
  await page.getByLabel("Dirección de envío", { exact: true }).fill("hola@contraste.local.test");
  await page.getByLabel("Nombre del remitente", { exact: true }).fill("Prueba contraste");
  const save = page.getByRole("button", { name: "Guardar remitente", exact: true });
  check(await save.isEnabled(), "botón del caso reportado disponible con proveedor simulado");
  await audit("Mailing remitente normal");
  await save.hover(); await page.waitForFunction(() => getComputedStyle([...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Guardar remitente')).backgroundColor === getComputedStyle(document.documentElement).getPropertyValue('--accent-hover').trim() || getComputedStyle([...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Guardar remitente')).color==='rgb(255, 255, 255)');
  await audit("Mailing remitente hover");
  await save.click();
  await page.getByRole("status").filter({hasText:"Remitente guardado"}).waitFor();
  check(await page.getByRole("button", { name: "Comprobar DNS" }).isVisible(), "Guardar remitente mantiene comportamiento exitoso");
}
let initialBranding; let initialMailing; let ownId;
try {
  check((await context.request.post("/api/auth/sign-in/email", { data: {email:"demo032@test.local",password:"DemoPrueba123!"} })).ok(), "sesión de prueba aislada");
  const companies=await (await context.request.get("/api/admin/companies")).json();
  ownId=companies.ownOrganizationId; initialMailing=companies.companies.find(company=>company.id===ownId).mailingEnabled;
  check((await context.request.patch(`/api/admin/companies/${ownId}/mailing`,{data:{enabled:true}})).ok(), "mailing habilitado únicamente en la empresa local de pruebas");
  initialBranding=(await (await context.request.get("/api/settings/branding")).json()).branding;
  await context.request.put("/api/settings/branding", {data:{name:initialBranding.name,accent:"#e84b1d"}});
  await mkdir(".artifacts/us43-orange-contrast",{recursive:true});
  await saveSender();
  const routes=["/dashboard","/inbox","/pipeline","/contacts","/agent","/campaigns","/templates","/services","/companies","/mailing","/settings/branding","/settings/calendar"];
  for (const mode of ["light","dark"]) {
    for(const route of routes) { await page.goto(route); await ready(); await theme(mode); await audit(`${route} ${mode}`); }
    await page.goto("/mailing");await ready();await theme(mode);await page.getByRole("button",{name:"Remitente y DNS",exact:true}).click();await page.getByRole("button",{name:"Guardar remitente",exact:true}).waitFor();await audit(`Remitente ${mode}`);
    await page.getByRole("button",{name:"Guardar remitente",exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:`.artifacts/us43-orange-contrast/mailing-${mode}.png`,animations:"disabled"});
    await page.goto("/agent");await ready();await theme(mode);
    await page.getByRole("button",{name:"Abrir chat demo"}).click();const message=page.getByLabel("Mensaje para el agente demo");await message.waitFor();
    check(await page.getByRole("button",{name:"Enviar prueba"}).isDisabled(),`demo vacío ${mode}: botón deshabilitado neutro`);
    await message.fill("Hola");await audit(`Demo enviar ${mode}`);
    await page.getByRole("button",{name:"Enviar prueba"}).click();await page.getByRole("log").getByText(/¡Hola! Soy/).waitFor();
    check(await page.getByRole("log").getByText(/¡Hola! Soy/).isVisible(),`demo ${mode}: interacción responde sin regresión`);
    await page.getByRole("button",{name:"Cerrar chat demo"}).click();
  }
  for(const color of ["#f14c0c","#ff9500","#ffee88"]) {
    await page.goto("/settings/branding");await ready();await page.locator('input[type="color"]').fill(color);
    const preview=page.getByText("Botón de ejemplo",{exact:true});await preview.waitFor();
    check((await preview.evaluate(el=>getComputedStyle(el).color))==="rgb(255, 255, 255)",`preview ${color}: texto blanco`);await audit(`Marca personalizada ${color}`);
  }
  for (const mode of ["light","dark"]) {
    await page.setViewportSize({width:390,height:844});await page.goto("/mailing");await ready();await theme(mode);await page.getByRole("button",{name:"Remitente y DNS",exact:true}).click();await audit(`Mailing móvil ${mode}`);
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Mailing móvil ${mode}: sin desbordamiento`);
    await page.getByRole("button",{name:"Guardar remitente",exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`.artifacts/us43-orange-contrast/mobile-${mode}.png`,animations:"disabled"});
  }
  const publicContext=await browser.newContext({baseURL,viewport:{width:1440,height:1000}});const publicPage=await publicContext.newPage();
  await publicPage.goto("/"); await publicPage.locator('a[href="/login"]').first().waitFor();
  const orange=await publicPage.locator('.bg-brand').evaluateAll(elements=>elements.filter(e=>e.textContent.trim()).map(e=>({text:e.textContent.trim().slice(0,50),color:getComputedStyle(e).color})));
  check(orange.every(item=>item.color==="rgb(255, 255, 255)"),"landing: CTA y muestras naranjas usan blanco");await publicContext.close();
  await writeFile(".artifacts/us43-orange-contrast/report.json",JSON.stringify({checks,report},null,2));
  console.log(`SELF-TEST CONTRASTE: ${checks} comprobaciones aprobadas`);
} catch (error) {
  console.error(String(error?.message ?? error).split("Call log:")[0]); process.exitCode=1;
} finally {
  if(ownId) await context.request.patch(`/api/admin/companies/${ownId}/mailing`,{data:{enabled:initialMailing}}).catch(()=>null);
  if(initialBranding) await context.request.put("/api/settings/branding",{data:initialBranding}).catch(()=>null);
  await browser.close();
}
