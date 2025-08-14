import { Context, Next } from "hono";
import { auth } from "../../../auth";

export default async function middleMan(c: Context, next: Next) {
  const r = await auth.api.getSession({
    headers: c.req.raw.headers
  });
  c.set('admin_id', r?.user.id)
  c.set("business_id", r?.user.business_id)
  await next()
}