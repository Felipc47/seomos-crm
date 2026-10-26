import { sql } from "drizzle-orm";
import { getDb,schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import { encryptSecret,decryptSecret } from "@/lib/crypto";
import { newId } from "@/lib/db/ids";
import { commerceUrl } from "@/lib/ecommerce/transport";
import { probeCommerce, searchCommerceProducts } from "@/lib/ecommerce/client";
import { connectionInput,type CommerceConnection,type ConnectionInput } from "@/lib/ecommerce/contracts";
export async function getCommerceConnection(org:string):Promise<CommerceConnection|null>{
  const [r]=await getDb().select().from(schema.commerceConnection).where(scoped(schema.commerceConnection.organizationId,org)).limit(1);if(!r)return null;
  const secret=connectionInput.parse({...JSON.parse(decryptSecret({cipher:r.secretCipher,iv:r.secretIv,tag:r.secretTag})),provider:r.provider,url:r.url,ordersEnabled:r.ordersEnabled});
  return {...secret,id:r.id,currency:r.currency,version:r.updatedAt.toISOString()};
}
export async function saveCommerceConnection(org:string,input:ConnectionInput){
  const url=commerceUrl(input.url,input.provider).origin;
  const c:CommerceConnection={...input,url,id:newId("commerceConnection"),currency:"USD",version:"new"};
  const currency=await probeCommerce(c);await searchCommerceProducts({...c,currency},"");const enc=encryptSecret(JSON.stringify({key:input.key,secret:input.secret,authMode:input.authMode}));
  // Nueva identidad en cada reconexión: los resúmenes anteriores quedan inválidos.
  await getDb().insert(schema.commerceConnection).values({id:c.id,organizationId:org,provider:input.provider,url,currency,ordersEnabled:input.ordersEnabled,secretCipher:enc.cipher,secretIv:enc.iv,secretTag:enc.tag}).onConflictDoUpdate({target:schema.commerceConnection.organizationId,set:{id:c.id,provider:input.provider,url,currency,ordersEnabled:input.ordersEnabled,secretCipher:enc.cipher,secretIv:enc.iv,secretTag:enc.tag,updatedAt:sql`now()`}});
}
export async function deleteCommerceConnection(org:string){await getDb().delete(schema.commerceConnection).where(scoped(schema.commerceConnection.organizationId,org));}
export function publicCommerceConnection(c:CommerceConnection|null){return c?{provider:c.provider,authMode:c.authMode,url:c.url,currency:c.currency,ordersEnabled:c.ordersEnabled,status:"connected" as const}:null;}
