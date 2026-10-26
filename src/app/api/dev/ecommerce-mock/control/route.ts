import { mockGuard } from "@/lib/dev-guard";
import { changeCommerceMock } from "@/server/dev/ecommerce-mock";
export async function POST(req:Request){const guard=mockGuard();if(guard)return guard;return Response.json(changeCommerceMock(await req.json().catch(()=>({}))));}
