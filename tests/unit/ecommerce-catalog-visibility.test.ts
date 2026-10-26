import{beforeEach,describe,expect,it,vi}from"vitest";
vi.mock("@/lib/ecommerce/transport",()=>({commerceRequest:vi.fn()}));
import{commerceRequest}from"@/lib/ecommerce/transport";
import{searchCommerceProducts}from"@/lib/ecommerce/client";
import type{CommerceConnection}from"@/lib/ecommerce/contracts";
const c:CommerceConnection={id:"ecc_visibility",provider:"shopify",authMode:"token",url:"https://shop.myshopify.com",key:"shpat_fictitious",ordersEnabled:false,currency:"COP",version:"v1"};
beforeEach(()=>vi.mocked(commerceRequest).mockReset());
describe("publicación del catálogo",()=>{
 it("no revela borradores Shopify aunque el proveedor los incluya y trata OR como texto",async()=>{const v={id:"gid://shopify/ProductVariant/1",title:"Azul",sku:"CAM",price:"1000",inventoryQuantity:2,inventoryPolicy:"DENY",inventoryItem:{tracked:true,requiresShipping:true},product:{title:"Público",status:"ACTIVE",onlineStoreUrl:null}};vi.mocked(commerceRequest).mockResolvedValueOnce({data:{shop:{currencyCode:"COP"}}}).mockResolvedValueOnce({data:{productVariants:{nodes:[v,{...v,id:"gid://shopify/ProductVariant/2",product:{...v.product,title:"Borrador secreto",status:"DRAFT"}}]}}});const rows=await searchCommerceProducts(c,"camiseta OR secreto");expect(rows.map(p=>p.name)).toEqual(["Público — Azul"]);expect(vi.mocked(commerceRequest).mock.calls[1]?.[3]).toMatchObject({variables:{q:'product_status:ACTIVE "camiseta" "OR" "secreto"'}});});
 it("no comparte productos WooCommerce sin publicar",async()=>{const p={id:1,name:"Público",type:"simple",status:"publish",purchasable:true,price:"1000",sku:"CAM",stock_status:"instock",manage_stock:true,stock_quantity:2,virtual:false};vi.mocked(commerceRequest).mockResolvedValueOnce({value:"COP"}).mockResolvedValueOnce([p,{...p,id:2,name:"Borrador secreto",status:"draft"}]);expect((await searchCommerceProducts({...c,provider:"woocommerce",secret:"fictitious"},"camiseta")).map(p=>p.name)).toEqual(["Público"]);});
});
