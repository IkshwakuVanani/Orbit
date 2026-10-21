import { env } from "cloudflare:workers";
import { handle } from "@/lib/service";
export const dynamic="force-dynamic";
export async function GET(r:Request){return handle(r,env.DB);}
export const POST=GET, PUT=GET, DELETE=GET;
