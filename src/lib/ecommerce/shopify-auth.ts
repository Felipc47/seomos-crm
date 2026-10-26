import {createHash} from "node:crypto";
import {z} from "zod";
import {CommerceError,type CommerceConnection} from "./contracts";
import {commerceRequest} from "./transport";
/** Apps propias del comercio: grant renovable, sin guardar bearer tokens en disco. */
export function createShopifyTokenManager(transport=commerceRequest,now=Date.now){
  const cache=new Map<string,{token:string;expiresAt:number}>(),pending=new Map<string,Promise<string>>();
  const cacheKey=(c:CommerceConnection)=>createHash("sha256").update(`${c.id}\0${c.url}\0${c.key}\0${c.secret??""}`).digest("hex");
  const invalidate=(c:CommerceConnection)=>cache.delete(cacheKey(c));
  async function accessToken(c:CommerceConnection):Promise<string>{
    if(c.authMode!=="client_credentials")return c.key;
    if(!c.secret)throw new CommerceError("auth");
    const key=cacheKey(c),current=cache.get(key),clock=now();if(current&&current.expiresAt>clock)return current.token;
    if(pending.has(key))return pending.get(key)!;
    const task=(async()=>{
      const raw=await transport(c.url,"/admin/oauth/access_token",{},new URLSearchParams({grant_type:"client_credentials",client_id:c.key,client_secret:c.secret!}).toString());
      const parsed=z.object({access_token:z.string().min(10).max(2000),expires_in:z.number().int().positive().max(604800)}).safeParse(raw);
      if(!parsed.success)throw new CommerceError("invalid_response");
      for(const [k,v]of cache)if(v.expiresAt<=now())cache.delete(k);
      if(cache.size>=500)cache.delete(cache.keys().next().value!);
      cache.set(key,{token:parsed.data.access_token,expiresAt:now()+parsed.data.expires_in*1000-Math.min(60000,parsed.data.expires_in*100)});
      return parsed.data.access_token;
    })();pending.set(key,task);try{return await task;}finally{pending.delete(key);}
  }
  return {accessToken,invalidate};
}
const globalTokens=globalThis as typeof globalThis & {__seomosShopifyTokens?:ReturnType<typeof createShopifyTokenManager>};
export const shopifyTokens=globalTokens.__seomosShopifyTokens??=createShopifyTokenManager();
