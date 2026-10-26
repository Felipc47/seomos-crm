import { z } from "zod";
export const providerSchema = z.enum(["woocommerce", "shopify"]);
export type CommerceProvider = z.infer<typeof providerSchema>;
export const connectionInput = z.object({
  provider: providerSchema, url: z.string().trim().min(1).max(500),
  key: z.string().trim().min(10).max(500), secret: z.string().trim().max(500).optional(),
  ordersEnabled: z.boolean().default(false),
}).strict().superRefine((v, ctx) => { if (v.provider === "woocommerce" && !v.secret) ctx.addIssue({code:"custom",path:["secret"],message:"Indica el secreto de WooCommerce"}); });
export type ConnectionInput = z.infer<typeof connectionInput>;
export type CommerceConnection = ConnectionInput & { id: string; currency: string; version: string };
export const productSchema = z.object({ id:z.string().min(1).max(150), name:z.string().min(1).max(300), sku:z.string().max(150), price:z.string().regex(/^\d+(\.\d{1,6})?$/), currency:z.string().regex(/^[A-Z]{3}$/), available:z.boolean(), stock:z.number().int().nullable(), requiresShipping:z.boolean(), url:z.string().max(2000).nullable() });
export type CommerceProduct = z.infer<typeof productSchema>;
export const buyerSchema = z.object({ name:z.string().trim().min(2).max(150),email:z.string().email().max(200),address:z.string().trim().min(3).max(250),city:z.string().trim().min(2).max(100),country:z.string().regex(/^[A-Z]{2}$/),state:z.string().trim().max(100).optional(),postcode:z.string().trim().max(20).optional() }).strict();
export type CommerceBuyer = z.infer<typeof buyerSchema>;
export const cartItemsSchema = z.array(z.object({id:z.string().min(1).max(150),quantity:z.number().int().min(1).max(20)}).strict()).min(1).max(10);
export type CartItem = z.infer<typeof cartItemsSchema>[number];
export type OrderQuote = { items:(CommerceProduct & {quantity:number})[]; buyer:CommerceBuyer; phone:string; subtotal:string;currency:string;connectionVersion:string;summary:string; };
export type StoreOrder = { id:string;reference:string;status:string;paid:boolean;currency:string;total:string;phone:string|null; };
export class CommerceError extends Error {
  constructor(public readonly code:"invalid_url"|"not_connected"|"auth"|"unavailable"|"invalid_response"|"rejected"|"stock"|"changed"|"uncertain", public readonly writeMayHaveSucceeded=false) {super(code);this.name="CommerceError";}
}
export function decimalSubtotal(items:{price:string;quantity:number}[]):string {
  const total=items.reduce((sum,p)=>{const [whole,fraction=""]=p.price.split(".");return sum+(BigInt(whole!)*1_000_000n+BigInt(fraction.padEnd(6,"0")))*BigInt(p.quantity);},0n);
  return `${total/1_000_000n}.${(total%1_000_000n).toString().padStart(6,"0")}`.replace(/\.?0+$/," ").trim();
}
export function customerConfirmedOrder(text:string):boolean {
  const t=text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().replace(/[.!¡,]+/g,"").trim();
  return /^(?:si(?:\s+confirmo(?:\s+(?:el|mi)\s+pedido)?)?|confirmo(?:\s+(?:el|mi)\s+pedido)?|acepto\s+(?:el|mi)\s+pedido|yes(?:\s+i\s+confirm(?:\s+(?:the|my)\s+order)?)?|i\s+confirm\s+(?:the|my)\s+order)$/.test(t);
}
export function samePhone(a:string|null,b:string):boolean { const clean=(s:string)=>s.replace(/\D/g,"").replace(/^00/,"");return !!a&&clean(a).length>=8&&clean(a)===clean(b); }
export function money(amount:string,currency:string):string {return `${amount} ${currency}`;}
/** Solo los ejecutores, tras verificar la tienda, pueden confirmar una escritura/pago. */
export function unverifiedCommerceClaim(text:string):boolean {
  const s=text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return /\b(?:pedido|order)\b[^.!?\n]{0,65}\b(?:cread[oa]|registrad[oa]|confirmad[oa]|created|registered|confirmed)\b/.test(s)||/\b(?:pago|payment)\b[^.!?\n]{0,45}\b(?:confirmad[oa]|recibid[oa]|confirmed|received|paid)\b/.test(s);
}
