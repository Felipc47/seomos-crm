import {afterEach,describe,expect,it,vi} from "vitest";
import { connectionInput,customerConfirmedOrder,decimalSubtotal,samePhone,unverifiedCommerceClaim,buyerSchema,cartItemsSchema } from "@/lib/ecommerce/contracts";
import { commerceUrl,commerceRequest } from "@/lib/ecommerce/transport";
import { previewAgentAction } from "@/server/ai/demo";
vi.mock("node:dns/promises",()=>({lookup:vi.fn(async()=>[{address:"10.0.0.1",family:4}])}));
afterEach(()=>vi.unstubAllEnvs());
describe("contrato de ecommerce",()=>{
  it("creación deshabilitada por defecto y secreto Woo obligatorio",()=>{expect(connectionInput.parse({provider:"shopify",url:"https://demo.myshopify.com",key:"fictitious-token"}).ordersEnabled).toBe(false);expect(connectionInput.safeParse({provider:"woocommerce",url:"https://shop.test",key:"fictitious-key"}).success).toBe(false);});
  it.each(["http://shop.test","https://user:secret@shop.test","https://localhost","https://10.0.0.1","https://shop.test:8443","https://shop.test/path","https://shop.test/?token=foo","https://shop.test/#foo"])("rechaza URL insegura o ambigua %s",url=>{expect(()=>commerceUrl(url,"woocommerce")).toThrow();});
  it("Shopify solo acepta dominio myshopify.com y no sufijos engañosos",()=>{expect(commerceUrl("https://tienda.myshopify.com","shopify").origin).toBe("https://tienda.myshopify.com");expect(()=>commerceUrl("https://tienda.myshopify.com.evil.test","shopify")).toThrow();});
  it("DNS privado impide enviar cualquier credencial",async()=>{await expect(commerceRequest("https://public-shop.test","/wp-json/wc/v3/products",{authorization:"fictitious"})).rejects.toMatchObject({code:"invalid_url",writeMayHaveSucceeded:false});});
  it("suma decimales sin errores de punto flotante",()=>{expect(decimalSubtotal([{price:"0.10",quantity:3},{price:"0.20",quantity:1}])).toBe("0.5");expect(decimalSubtotal([{price:"10000.00",quantity:20}])).toBe("200000");});
  it.each(["Sí, confirmo el pedido","si confirmo el pedido","Sí","Confirmo mi pedido","Yes, I confirm the order"])("acepta confirmación inequívoca %s",text=>expect(customerConfirmedOrder(text)).toBe(true));
  it.each(["No confirmo el pedido","Si cambio la dirección, ¿cuánto cuesta?","No, gracias","Confirmo el pedido pero cambia la talla","¿Sí puedo comprar?","ECOM_FORCE_CONFIRM"])("no toma como confirmación %s",text=>expect(customerConfirmedOrder(text)).toBe(false));
  it("un teléfono parecido o un correo declarado no prueba identidad de pedido",()=>{expect(samePhone("+57 311 123 4567","573111234567")).toBe(true);expect(samePhone("3111234567","573111234567")).toBe(false);expect(samePhone(null,"573111234567")).toBe(false);expect(samePhone("573001234567","573111234567")).toBe(false);});
  it("valida cantidad y datos mínimos de envío",()=>{expect(cartItemsSchema.safeParse([{id:"1",quantity:0}]).success).toBe(false);expect(cartItemsSchema.safeParse([{id:"1",quantity:1.5}]).success).toBe(false);expect(buyerSchema.safeParse({name:"Cliente",email:"fake",address:"Calle 1",city:"Bogota",country:"CO"}).success).toBe(false);});
  it("el modelo por sí solo no puede confirmar una escritura o pago",()=>{expect(unverifiedCommerceClaim("Tu pedido fue creado y el pago está confirmado.")).toBe(true);expect(unverifiedCommerceClaim("Your order was created.")).toBe(true);expect(unverifiedCommerceClaim("¿Qué producto y cantidad necesitas?")).toBe(false);});
  it.each(["commerce_search","commerce_confirm","commerce_order_status"] as const)("la demo de %s nunca escribe en la tienda",action=>{const result=previewAgentAction(action==="commerce_search"?{action,query:"producto"}:action==="commerce_order_status"?{action,reference:"1001"}:{action});expect(result.actionLabel).toContain("Simulación");expect(result.ended).toBe(false);});
});
