import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { isMockEnabled, getEnv } from "@/lib/env";
import { isPublicAddress, normalizeWebsiteUrl } from "@/server/ai/website-reader";
import { CommerceError, type CommerceProvider } from "./contracts";
const mockHosts=["woo.commerce.test","shop.commerce.test"];
export function commerceUrl(raw:string,provider:CommerceProvider):URL {
  let url:URL;
  try { url=normalizeWebsiteUrl(raw); } catch { throw new CommerceError("invalid_url"); }
  if(url.protocol!=="https:"||new URL(raw.includes("://")?raw:`https://${raw}`).hash||url.search||url.hash||url.pathname!=="/"&&url.pathname!=="") throw new CommerceError("invalid_url");
  if(provider==="shopify"&&!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(url.hostname)&&!(isMockEnabled()&&url.hostname==="shop.commerce.test")) throw new CommerceError("invalid_url");
  return url;
}
/** HTTPS, DNS fijado, sin redirecciones ni reintentos de escrituras. */
export async function commerceRequest(base:string,path:string,headers:Record<string,string>,body?:unknown):Promise<unknown> {
  const url=new URL(path,base),writing=body!==undefined;
  let status:number,text:string;
  if(isMockEnabled()&&mockHosts.includes(url.hostname)) {
    const res=await fetch(`${getEnv().APP_BASE_URL}/api/dev/ecommerce-mock/provider/${url.hostname.startsWith("woo")?"woocommerce":"shopify"}${url.pathname}${url.search}`,{method:writing?"POST":"GET",headers:{...headers,"content-type":"application/json"},body:writing?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000),redirect:"error"}).catch(()=>{throw new CommerceError("unavailable",writing);});
    status=res.status;text=await res.text();
  } else {
    const addresses=isIP(url.hostname)?[{address:url.hostname,family:isIP(url.hostname)}]:await lookup(url.hostname,{all:true,verbatim:true}).catch(()=>{throw new CommerceError("unavailable");});
    if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))throw new CommerceError("invalid_url");
    const pinned=((_host:unknown,options:unknown,callback:unknown)=>{const cb=callback as (...args:unknown[])=>void;const all=typeof options==="object"&&options!==null&&"all" in options&&(options as {all:boolean}).all;const a=addresses[0]!;if(all)cb(null,addresses);else cb(null,a.address,a.family);}) as LookupFunction;
    ({status,text}=await new Promise<{status:number;text:string}>((resolve,reject)=>{
      let sent=false;
      const req=request(url,{method:writing?"POST":"GET",headers:{...headers,"content-type":"application/json","accept":"application/json"},lookup:pinned},res=>{
        let size=0;const chunks:Buffer[]=[];
        res.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>1_000_000)res.destroy(new Error("limit"));else chunks.push(chunk);});
        res.on("end",()=>resolve({status:res.statusCode??0,text:Buffer.concat(chunks).toString("utf8")}));
        res.on("error",()=>reject(new CommerceError("unavailable",writing&&sent)));
      });
      req.on("finish",()=>{sent=true;});req.setTimeout(12000,()=>req.destroy(new Error("timeout")));req.on("error",()=>reject(new CommerceError("unavailable",writing&&sent)));
      if(writing)req.write(JSON.stringify(body));req.end();
    }));
  }
  if(status===401||status===403)throw new CommerceError("auth");
  if(status<200||status>=300)throw new CommerceError(status>=500?"unavailable":"rejected",writing&&status>=500);
  try{return JSON.parse(text);}catch{throw new CommerceError("invalid_response",writing);}
}
