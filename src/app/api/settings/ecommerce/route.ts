import { desc } from "drizzle-orm";
import { withAuth,apiError,parseBody } from "@/lib/api";
import { canManageOrgSettings } from "@/lib/permissions";
import { connectionInput,CommerceError } from "@/lib/ecommerce/contracts";
import { getCommerceConnection,saveCommerceConnection,deleteCommerceConnection,publicCommerceConnection } from "@/server/ecommerce/connections";
import { getDb,schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
export const dynamic="force-dynamic";
export const GET=withAuth(async session=>{
  if(!canManageOrgSettings(session.role))return apiError(403,"forbidden","Solo el administrador puede gestionar la tienda");
  const c=await getCommerceConnection(session.organizationId);
  const attempts=await getDb().select({id:schema.commerceQuote.id,status:schema.commerceQuote.status,reference:schema.commerceQuote.remoteReference,createdAt:schema.commerceQuote.createdAt}).from(schema.commerceQuote).where(scoped(schema.commerceQuote.organizationId,session.organizationId)).orderBy(desc(schema.commerceQuote.createdAt)).limit(20);
  return Response.json({connection:publicCommerceConnection(c),attempts},{headers:{"Cache-Control":"no-store"}});
});
export const PUT=withAuth(async(session,req:Request)=>{
  if(!canManageOrgSettings(session.role))return apiError(403,"forbidden","Solo el administrador puede conectar la tienda");
  const input=await parseBody(req,connectionInput);if(!input.ok)return input.response;
  try{await saveCommerceConnection(session.organizationId,{...input.data,ordersEnabled:input.data.ordersEnabled??false});return Response.json({ok:true});}
  catch(e){const code=e instanceof CommerceError?e.code:"unavailable";return apiError(code==="invalid_url"?422:code==="auth"?422:503,`commerce_${code}`,code==="invalid_url"?"Usa la URL HTTPS pública de la tienda, sin rutas. Shopify requiere el dominio myshopify.com.":code==="auth"?"Revisa las credenciales y permisos de catálogo y pedidos.":"No pudimos verificar la tienda. No se cambió la conexión guardada.");}
});
export const DELETE=withAuth(async session=>{if(!canManageOrgSettings(session.role))return apiError(403,"forbidden","Solo el administrador puede desconectar la tienda");await deleteCommerceConnection(session.organizationId);return Response.json({ok:true});});
