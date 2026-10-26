/** Fixtures exclusivamente detrás de mockGuard y hosts de prueba explícitos. */
type MockOrder={provider:string;woo:Record<string,unknown>;shop:Record<string,unknown>;request:Record<string,unknown>;key:string};
type MockState={tokenRequests:number;tokenLifetime:number;currency:string;price:string;stock:number;revoked:boolean;failNext:number;badJson:boolean;loseNextWrite:boolean;rejectNextWrite:boolean;writes:number;orders:MockOrder[]};
const root=globalThis as typeof globalThis & {__commerceMock?:MockState};
function defaults():MockState{return{tokenRequests:0,tokenLifetime:86399,currency:"COP",price:"10000.00",stock:12,revoked:false,failNext:0,badJson:false,loseNextWrite:false,rejectNextWrite:false,writes:0,orders:[]};}
export function commerceMockState(){return root.__commerceMock??=defaults();}
export function changeCommerceMock(input:Record<string,unknown>){if(input.reset)root.__commerceMock=defaults();const s=commerceMockState();for(const k of ["tokenLifetime","currency","price","stock","revoked","failNext","badJson","loseNextWrite","rejectNextWrite"] as const)if(input[k]!==undefined)(s as unknown as Record<string,unknown>)[k]=input[k];return s;}
export function commerceMockResponse(provider:string,path:string,method:string,body:Record<string,unknown>,headers:Headers):Response{
  const s=commerceMockState();if(s.revoked||headers.get("authorization")?.includes("cmV2b2tlZA")||headers.get("x-shopify-access-token")?.includes("revoked"))return Response.json({error:"unauthorized"},{status:401});
  if(s.failNext>0){s.failNext--;return Response.json({error:"unavailable"},{status:503});}
  if(s.badJson)return new Response("invalid json",{headers:{"content-type":"application/json"}});
  const p={id:1,name:"Camiseta algodón",type:"simple",status:"publish",purchasable:true,price:s.price,sku:"CAM-01",stock_status:s.stock>0?"instock":"outofstock",manage_stock:true,stock_quantity:s.stock,virtual:false,permalink:"https://woo.commerce.test/producto/camiseta"};
  const variable={...p,id:2,name:"Camiseta colores",type:"variable",price:""};
  const v={...p,id:21,name:"Azul",type:undefined,attributes:[{option:"Azul"}]};
  if(provider==="woocommerce"){
    if(path==="settings/general/woocommerce_currency")return Response.json({value:s.currency});
    if(path==="products")return Response.json([p,variable]);
    if(path==="products/1")return Response.json(p);
    if(path==="products/2")return Response.json(variable);
    if(path==="products/2/variations")return Response.json([v,{...v,id:22,name:"Rojo",stock_status:"outofstock",stock_quantity:0,attributes:[{option:"Rojo"}]}]);
    if(path==="products/2/variations/21")return Response.json(v);
    if(path==="products/2/variations/22")return Response.json({...v,id:22,stock_status:"outofstock",stock_quantity:0});
    if(path==="orders"&&method==="POST"){
      if(s.rejectNextWrite){s.rejectNextWrite=false;return Response.json({error:"invalid_order"},{status:400});}
      if(body.set_paid!==false||body.status!=="pending")return Response.json({error:"not_unpaid"},{status:400});
      const id=1001+s.orders.length;const billing=body.billing as {phone:string};
      const woo={id,number:String(id),status:"pending",currency:s.currency,total:s.price,date_paid:null,billing,meta_data:body.meta_data};
      s.writes++;s.orders.push({provider,woo,shop:{},request:body,key:String((body.meta_data as {value:string}[])[0]?.value??"")});
      if(s.loseNextWrite){s.loseNextWrite=false;return Response.json({error:"response_lost"},{status:503});}return Response.json(woo,{status:201});
    }
    if(path==="orders")return Response.json(s.orders.filter(o=>o.provider===provider).map(o=>o.woo));
    if(path==="orders/9999")return Response.json({id:9999,number:"9999",status:"completed",currency:s.currency,total:"123",date_paid:"2026-01-01",billing:{phone:"573000000000"}});
    if(path.startsWith("orders/")){const o=s.orders.find(o=>o.provider===provider&&String(o.woo.id)===path.split("/")[1]);return o?Response.json(o.woo):Response.json({error:"not_found"},{status:404});}
  }
  if(provider==="shopify"){
    if(path==="admin/oauth/access_token"){if(body.grant_type!=="client_credentials"||!body.client_id||!body.client_secret)return Response.json({error:"invalid_grant"},{status:400});s.tokenRequests++;return Response.json({access_token:`shpat_mock_grant_${s.tokenRequests}`,expires_in:s.tokenLifetime});}
    if(!headers.get("x-shopify-access-token")?.startsWith("shpat"))return Response.json({error:"bearer_required"},{status:401});
    const query=String(body.query??""),vars=(body.variables??{}) as Record<string,unknown>;
    const node={id:"gid://shopify/ProductVariant/101",title:"Azul",sku:"CAM-AZUL",price:s.price,inventoryQuantity:s.stock,inventoryPolicy:"DENY",inventoryItem:{tracked:true,requiresShipping:true},product:{title:"Camiseta algodón",status:"ACTIVE",onlineStoreUrl:"https://shop.commerce.test/products/camiseta"}};
    if(query.includes("CommerceCurrency"))return Response.json({data:{shop:{currencyCode:s.currency}}});
    if(query.includes("CommerceConnection"))return Response.json({data:{shop:{currencyCode:s.currency},currentAppInstallation:{accessScopes:["read_products","read_inventory","read_orders","write_orders"].map(handle=>({handle}))},productVariants:{nodes:[{id:node.id}]}}});
    if(query.includes("CommerceProducts"))return Response.json({data:{productVariants:{nodes:[node,{...node,id:"gid://shopify/ProductVariant/102",title:"Rojo",inventoryQuantity:0}]}}});
    if(query.includes("CommerceProduct("))return Response.json({data:{productVariant:vars.id===node.id?node:vars.id==="gid://shopify/ProductVariant/102"?{...node,inventoryQuantity:0}:null}});
    if(query.includes("CommerceCreate")){
      if(s.rejectNextWrite){s.rejectNextWrite=false;return Response.json({data:{orderCreate:{order:null,userErrors:[{message:"invalid address"}]}}});}
      const order=vars.order as Record<string,unknown>,options=vars.options as Record<string,unknown>;
      if(order.financialStatus!=="PENDING"||(order.transactions as unknown[])?.length||options.inventoryBehaviour!=="DECREMENT_OBEYING_POLICY"||options.sendReceipt!==false)return Response.json({data:{orderCreate:{order:null,userErrors:[{message:"unpaid contract"}]}}});
      const id=1001+s.orders.length;const shop={id:`gid://shopify/Order/${id}`,name:`#${id}`,displayFinancialStatus:"PENDING",displayFulfillmentStatus:"UNFULFILLED",phone:order.phone,shippingAddress:{phone:order.phone},totalPriceSet:{shopMoney:{amount:s.price,currencyCode:s.currency}}};
      s.writes++;s.orders.push({provider,woo:{},shop,request:order,key:String(order.sourceIdentifier)});
      if(s.loseNextWrite){s.loseNextWrite=false;return Response.json({error:"lost"},{status:503});}return Response.json({data:{orderCreate:{order:shop,userErrors:[]}}});
    }
    if(query.includes("CommerceReconcile")){const key=String(vars.q).replace("tag:seomos-","");return Response.json({data:{orders:{nodes:s.orders.filter(o=>o.provider===provider&&o.key===key).map(o=>o.shop)}}});}
    if(query.includes("CommerceOrder")){const ref=String(vars.q).replace("name:","");if(ref==="9999")return Response.json({data:{orders:{nodes:[{id:"gid://shopify/Order/9999",name:"#9999",displayFinancialStatus:"PAID",displayFulfillmentStatus:"FULFILLED",phone:"573000000000",shippingAddress:null,totalPriceSet:{shopMoney:{amount:"123",currencyCode:s.currency}}}]}}});return Response.json({data:{orders:{nodes:s.orders.filter(o=>o.provider===provider&&String(o.shop.name)===`#${ref}`).map(o=>o.shop)}}});}
  }
  return Response.json({error:"not_found"},{status:404});
}
