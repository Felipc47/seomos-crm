import { withAuth,apiError } from "@/lib/api";
import { canManageOrgSettings } from "@/lib/permissions";
import { getCommerceConnection } from "@/server/ecommerce/connections";
import { probeCommerce,searchCommerceProducts } from "@/lib/ecommerce/client";
export const POST=withAuth(async(session)=>{
  if(!canManageOrgSettings(session.role))return apiError(403,"forbidden","Solo el administrador puede probar la tienda");
  const c=await getCommerceConnection(session.organizationId);if(!c)return apiError(404,"not_connected","Todavía no hay tienda conectada");
  try{await probeCommerce(c);const products=await searchCommerceProducts(c,"");return Response.json({ok:true,products:products.slice(0,8)},{headers:{"Cache-Control":"no-store"}});}catch{return apiError(503,"commerce_unavailable","No pudimos consultar la tienda. Revisa la conexión y sus permisos.");}
});
