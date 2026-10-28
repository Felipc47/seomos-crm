import { describe, expect, it, vi, afterEach } from "vitest";
import { isSmsStop, nextSmsStatus, smsSegments, usPhone, smsContactInput } from "@/lib/sms";
import { parseSmsEvent, smsEventKey } from "@/lib/brevo/events";
vi.mock("@/lib/env",()=>({getEnv:()=>({APP_BASE_URL:"http://localhost:3110"}),isMockEnabled:()=>true}));
import { registerSmsWebhook, sendBrevoSms } from "@/lib/brevo/client";
afterEach(()=>vi.unstubAllGlobals());
describe("SMS validation and state",()=>{
  it("accepts US and rejects other NANP territories",()=>{ expect(usPhone("+12025550123")).toBe("+12025550123"); expect(usPhone("+14165550123")).toBeNull();expect(usPhone("+17875550123")).toBeNull();expect(usPhone("+573001234567")).toBeNull(); });
  it("requires independent evidence",()=>{expect(smsContactInput.safeParse({name:"A",phone:"+12025550123",consentEvidence:""}).success).toBe(false);});
  it("counts GSM extension and UTF16 segments",()=>{expect(smsSegments("a".repeat(160))).toEqual({unicode:false,segments:1});expect(smsSegments("a".repeat(161)).segments).toBe(2);expect(smsSegments("^".repeat(81)).segments).toBe(2);expect(smsSegments("á".repeat(71))).toEqual({unicode:true,segments:2});expect(smsSegments("😀".repeat(36)).segments).toBe(2);});
  it("does not regress delivery and does not auto-resubscribe",()=>{expect(nextSmsStatus("delivered","accepted")).toBe("delivered");expect(nextSmsStatus("sent","accepted")).toBe("sent");expect(nextSmsStatus("uncertain","delivered")).toBe("delivered");expect(nextSmsStatus("failed","sent")).toBe("failed");expect(isSmsStop(" STOP! ")).toBe(true);expect(isSmsStop("Please stop by tomorrow")).toBe(false);});
  it("deduplicates events using message, status, reply and time instead of webhook id",()=>{ const raw={id:5,msg_status:"replied",to:"12025550123",messageId:123,reply:"Yes",ts_event:100};const first=parseSmsEvent(raw)!;expect(smsEventKey(first)).toBe(smsEventKey(parseSmsEvent({...raw,id:99})!));expect(smsEventKey(first)).not.toBe(smsEventKey(parseSmsEvent({...raw,ts_event:101})!));expect(parseSmsEvent({...raw,to:"14165550123"})).toBeNull();expect(parseSmsEvent({...raw,reply:""})).toBeNull();});
});
describe("Brevo writes never retry",()=>{
  const payload={recipient:"+12025550123",sender:"+12025550124",content:"Test",tag:"smsg_test"};
  for(const [status,code] of [[401,"auth"],[429,"rate_limit"],[400,"rejected"],[503,"uncertain"]] as const) it(`sanitizes ${status}`,async()=>{const f=vi.fn().mockResolvedValue(new Response("secret",{status}));vi.stubGlobal("fetch",f);await expect(sendBrevoSms("secret",payload)).rejects.toMatchObject({code});expect(f).toHaveBeenCalledTimes(1);});
  it("preserves ambiguity for malformed acceptance",async()=>{const f=vi.fn().mockResolvedValue(new Response("unexpected"));vi.stubGlobal("fetch",f);await expect(sendBrevoSms("secret",payload)).rejects.toMatchObject({code:"uncertain"});expect(f).toHaveBeenCalledTimes(1);});
  it("preserves ambiguity for network timeout",async()=>{vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("secret")));await expect(sendBrevoSms("secret",payload)).rejects.toMatchObject({code:"uncertain"});});
  it("sends typed payload with unicode and idempotency tag",async()=>{const f=vi.fn().mockResolvedValue(Response.json({messageId:123}));vi.stubGlobal("fetch",f);expect(await sendBrevoSms("secret",{...payload,content:"Hola 😀"})).toBe("123");expect(JSON.parse(f.mock.calls[0]![1].body)).toMatchObject({unicodeEnabled:true,tag:"smsg_test",type:"transactional"});});
  it("sets callback authentication in headers",async()=>{const f=vi.fn().mockResolvedValue(Response.json({id:9}));vi.stubGlobal("fetch",f);expect(await registerSmsWebhook("secret","https://crm.example/api/webhooks/brevo/org","token")).toBe("9");expect(JSON.parse(f.mock.calls[0]![1].body)).toMatchObject({channel:"sms",events:["sent","delivered","reply","softBounce","hardBounce","unsubscribed"],headers:[{key:"Authorization",value:"Bearer token"}]});});
});
