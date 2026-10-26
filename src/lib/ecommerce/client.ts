import { z } from "zod";
import { CommerceError, productSchema, type CommerceConnection, type CommerceProduct, type OrderQuote, type StoreOrder } from "./contracts";
import { commerceRequest } from "./transport";
const wooProduct=z.object({id:z.number(),name:z.string().optional(),type:z.string().optional(),status:z.string().optional(),purchasable:z.boolean().optional(),price:z.string(),sku:z.string().optional(),stock_status:z.string(),manage_stock:z.boolean().optional(),stock_quantity:z.number().nullable().optional(),virtual:z.boolean().optional(),permalink:z.string().optional(),attributes:z.array(z.object({option:z.string().optional()})).optional()});
const variant=z.object({id:z.string(),title:z.string(),sku:z.string().nullable(),price:z.string(),inventoryQuantity:z.number().nullable(),inventoryPolicy:z.string(),inventoryItem:z.object({tracked:z.boolean(),requiresShipping:z.boolean()}),product:z.object({title:z.string(),status:z.string(),onlineStoreUrl:z.string().nullable()})});
const variantFields="id title sku price inventoryQuantity inventoryPolicy inventoryItem { tracked requiresShipping } product { title status onlineStoreUrl }";
function parsed<T>(schema:z.ZodType<T>,raw:unknown):T {const result=schema.safeParse(raw);if(!result.success)throw new CommerceError("invalid_response");return result.data;}
export function wooCall(c:CommerceConnection,path:string,body?:unknown){return commerceRequest(c.url,`/wp-json/wc/v3/${path}`,{authorization:`Basic ${Buffer.from(`${c.key}:${c.secret}`).toString("base64")}`},body);}
export async function shopCall(c:CommerceConnection,query:string,variables:Record<string,unknown>={}):Promise<Record<string,unknown>> {
  const envelope=parsed(z.object({data:z.record(z.unknown()).nullable().optional(),errors:z.array(z.unknown()).optional()}),await commerceRequest(c.url,"/admin/api/2026-10/graphql.json",{"X-Shopify-Access-Token":c.key},{query,variables}));
  if(envelope.errors?.length||!envelope.data)throw new CommerceError("rejected",query.includes("mutation"));return envelope.data;
}
export async function probeCommerce(c:CommerceConnection):Promise<string> {
  if(c.provider==="woocommerce") {
    parsed(z.array(wooProduct),await wooCall(c,"products?per_page=1&status=publish"));
    const currency=parsed(z.object({value:z.string().regex(/^[A-Z]{3}$/)}),await wooCall(c,"settings/general/woocommerce_currency"));
    if(c.ordersEnabled)parsed(z.array(z.object({id:z.number()})),await wooCall(c,"orders?per_page=1"));return currency.value;
  }
  const data=await shopCall(c,"query CommerceConnection { shop { currencyCode } currentAppInstallation { accessScopes { handle } } productVariants(first:1) { nodes { id } } }");
  const value=parsed(z.object({shop:z.object({currencyCode:z.string().regex(/^[A-Z]{3}$/)}),currentAppInstallation:z.object({accessScopes:z.array(z.object({handle:z.string()}))})}),data);
  const scopes=value.currentAppInstallation.accessScopes.map(s=>s.handle);
  if(!scopes.some(s=>s==="read_products"||s==="write_products")||c.ordersEnabled&&(!scopes.includes("write_orders")))throw new CommerceError("auth");
  return value.shop.currencyCode;
}
function fromWoo(raw:z.infer<typeof wooProduct>,c:CommerceConnection,parent?:z.infer<typeof wooProduct>):CommerceProduct {
  return parsed(productSchema,{id:parent?`${parent.id}:${raw.id}`:`${raw.id}`,name:(parent?`${parent.name} — ${raw.attributes?.map(a=>a.option).filter(Boolean).join(" / ")||raw.name||raw.id}`:raw.name)?.slice(0,300),sku:raw.sku??"",price:raw.price,currency:c.currency,available:(raw.status===undefined||raw.status==="publish")&&raw.purchasable!==false&&raw.stock_status==="instock",stock:raw.manage_stock?raw.stock_quantity??null:null,requiresShipping:!(raw.virtual??parent?.virtual),url:raw.permalink||parent?.permalink||null});
}
function fromShop(raw:z.infer<typeof variant>,c:CommerceConnection):CommerceProduct {
  return parsed(productSchema,{id:raw.id,name:`${raw.product.title}${raw.title==="Default Title"?"":` — ${raw.title}`}`.slice(0,300),sku:raw.sku??"",price:raw.price,currency:c.currency,available:raw.product.status==="ACTIVE"&&(!raw.inventoryItem.tracked||raw.inventoryPolicy==="CONTINUE"||(raw.inventoryQuantity??0)>0),stock:raw.inventoryItem.tracked&&raw.inventoryPolicy!=="CONTINUE"?raw.inventoryQuantity:null,requiresShipping:raw.inventoryItem.requiresShipping,url:raw.product.onlineStoreUrl});
}
export async function readCommerceCurrency(c:CommerceConnection):Promise<string> {
  if(c.provider==="woocommerce")return parsed(z.object({value:z.string().regex(/^[A-Z]{3}$/)}),await wooCall(c,"settings/general/woocommerce_currency")).value;
  const data=await shopCall(c,"query CommerceCurrency { shop { currencyCode } }");return parsed(z.object({shop:z.object({currencyCode:z.string().regex(/^[A-Z]{3}$/)})}),data).shop.currencyCode;
}
export async function searchCommerceProducts(c:CommerceConnection,query:string):Promise<CommerceProduct[]> {
  c={...c,currency:await readCommerceCurrency(c)};
  if(c.provider==="shopify") {
    const safe=query.replace(/[^\p{L}\p{N}\s-]/gu," ").trim().slice(0,100);
    const data=await shopCall(c,`query CommerceProducts($q:String!) { productVariants(first:20,query:$q) { nodes { ${variantFields} } } }`,{q:`product_status:active ${safe}`});
    return parsed(z.object({productVariants:z.object({nodes:z.array(variant)})}),data).productVariants.nodes.map(v=>fromShop(v,c));
  }
  const rows=parsed(z.array(wooProduct),await wooCall(c,`products?per_page=8&status=publish&search=${encodeURIComponent(query)}`));
  const products:CommerceProduct[]=[];
  for(const p of rows){
    if(p.type==="variable") {const vars=parsed(z.array(wooProduct),await wooCall(c,`products/${p.id}/variations?per_page=20&status=publish`));for(const v of vars)if(v.price)products.push(fromWoo(v,c,p));}
    else if(p.type==="simple"&&p.price)products.push(fromWoo(p,c));
  }return products.slice(0,24);
}
export async function readCommerceProduct(c:CommerceConnection,id:string):Promise<CommerceProduct> {
  c={...c,currency:await readCommerceCurrency(c)};
  if(c.provider==="shopify") {if(!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(id))throw new CommerceError("rejected");const data=await shopCall(c,`query CommerceProduct($id:ID!) { productVariant(id:$id) { ${variantFields} } }`,{id});return fromShop(parsed(z.object({productVariant:variant}),data).productVariant,c);}
  if(!/^\d+(?::\d+)?$/.test(id))throw new CommerceError("rejected");const [parent,v]=id.split(":");
  const p=parsed(wooProduct,await wooCall(c,`products/${parent}`));if(p.status!=="publish")throw new CommerceError("stock");if(v)return fromWoo(parsed(wooProduct,await wooCall(c,`products/${parent}/variations/${v}`)),c,p);
  if(p.type!=="simple"||p.status!=="publish")throw new CommerceError("stock");return fromWoo(p,c);
}
const wooOrder=z.object({id:z.number(),number:z.string(),status:z.string(),currency:z.string(),total:z.string(),date_paid:z.string().nullable().optional(),billing:z.object({phone:z.string().optional()}),meta_data:z.array(z.object({key:z.string(),value:z.unknown()})).optional()});
const shopOrder=z.object({id:z.string(),name:z.string(),displayFinancialStatus:z.string(),displayFulfillmentStatus:z.string(),phone:z.string().nullable(),shippingAddress:z.object({phone:z.string().nullable()}).nullable(),totalPriceSet:z.object({shopMoney:z.object({amount:z.string(),currencyCode:z.string()})})});
const orderFields="id name displayFinancialStatus displayFulfillmentStatus phone shippingAddress { phone } totalPriceSet { shopMoney { amount currencyCode } }";
function orderWoo(r:z.infer<typeof wooOrder>):StoreOrder{return{id:String(r.id),reference:r.number,status:r.status,paid:!!r.date_paid||["processing","completed"].includes(r.status),currency:r.currency,total:r.total,phone:r.billing.phone??null};}
function orderShop(r:z.infer<typeof shopOrder>):StoreOrder{return{id:r.id,reference:r.name,status:`${r.displayFinancialStatus} / ${r.displayFulfillmentStatus}`,paid:["PAID","PARTIALLY_REFUNDED","REFUNDED"].includes(r.displayFinancialStatus),currency:r.totalPriceSet.shopMoney.currencyCode,total:r.totalPriceSet.shopMoney.amount,phone:r.phone??r.shippingAddress?.phone??null};}
export async function createUnpaidOrder(c:CommerceConnection,quote:OrderQuote,key:string):Promise<StoreOrder> {
  if(!c.ordersEnabled)throw new CommerceError("rejected");
  const b=quote.buyer,[firstName,...last]=b.name.split(/\s+/),lastName=last.join(" "),phone=`+${quote.phone.replace(/\D/g,"")}`;
  if(c.provider==="woocommerce") {
    const address={first_name:firstName,last_name:lastName,email:b.email,phone,address_1:b.address,city:b.city,country:b.country,state:b.state??"",postcode:b.postcode??""};
    const raw=await wooCall(c,"orders",{status:"pending",set_paid:false,billing:address,shipping:address,customer_note:"Pedido confirmado por WhatsApp. Pendiente de pago; envío e impuestos finales requieren validación de la tienda.",created_via:"seomos-crm",line_items:quote.items.map(i=>({product_id:Number(i.id.split(":")[0]),...(i.id.includes(":")?{variation_id:Number(i.id.split(":")[1])}:{}),quantity:i.quantity})),meta_data:[{key:"_seomos_request",value:key}]});
    try{return orderWoo(parsed(wooOrder,raw));}catch{throw new CommerceError("invalid_response",true);}
  }
  const address={firstName,lastName,address1:b.address,city:b.city,countryCode:b.country,provinceCode:b.state||undefined,zip:b.postcode||undefined,phone};
  const data=await shopCall(c,`mutation CommerceCreate($order:OrderCreateOrderInput!,$options:OrderCreateOptionsInput) { orderCreate(order:$order,options:$options) { order { ${orderFields} } userErrors { field message } } }`,{order:{email:b.email,phone,currency:quote.currency,financialStatus:"PENDING",shippingAddress:address,billingAddress:address,buyerAcceptsMarketing:false,sourceIdentifier:key,tags:["seomos-crm",`seomos-${key}`],note:"Confirmado por WhatsApp. Sin pagar. Envío e impuestos finales pendientes de validación.",lineItems:quote.items.map(i=>({variantId:i.id,quantity:i.quantity})),transactions:[]},options:{inventoryBehaviour:"DECREMENT_OBEYING_POLICY",sendReceipt:false,sendFulfillmentReceipt:false}});
  const result=parsed(z.object({orderCreate:z.object({order:shopOrder.nullable(),userErrors:z.array(z.object({message:z.string()}))})}),data).orderCreate;
  if(!result.order)throw new CommerceError(result.userErrors.length?"rejected":"invalid_response",!result.userErrors.length);return orderShop(result.order);
}
export async function findCommerceOrder(c:CommerceConnection,reference:string):Promise<StoreOrder|null> {
  if(c.provider==="woocommerce") {if(!/^\d+$/.test(reference))return null;try{return orderWoo(parsed(wooOrder,await wooCall(c,`orders/${reference}`)));}catch(e){if(e instanceof CommerceError&&e.code==="rejected")return null;throw e;}}
  if(!/^#?[\w-]{1,60}$/.test(reference))return null;
  const data=await shopCall(c,`query CommerceOrder($q:String!) { orders(first:1,query:$q) { nodes { ${orderFields} } } }`,{q:`name:${reference.replace(/^#/,"")}`});
  const rows=parsed(z.object({orders:z.object({nodes:z.array(shopOrder)})}),data).orders.nodes;return rows[0]?orderShop(rows[0]):null;
}
export async function reconcileCommerceOrder(c:CommerceConnection,key:string):Promise<StoreOrder|null> {
  if(c.provider==="woocommerce") {const rows=parsed(z.array(wooOrder),await wooCall(c,"orders?per_page=100&orderby=date&order=desc"));const r=rows.find(r=>r.meta_data?.some(m=>m.key==="_seomos_request"&&m.value===key));return r?orderWoo(r):null;}
  const data=await shopCall(c,`query CommerceReconcile($q:String!) { orders(first:1,query:$q) { nodes { ${orderFields} } } }`,{q:`tag:seomos-${key}`});const rows=parsed(z.object({orders:z.object({nodes:z.array(shopOrder)})}),data).orders.nodes;return rows[0]?orderShop(rows[0]):null;
}
