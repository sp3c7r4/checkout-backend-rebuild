import { Context, Hono } from "hono";
import { getUsers, imageUpload } from "../controller/user.controller";
import { zValidator } from '@hono/zod-validator'
import tryCatch from "../utils/TryCatch";
import { base64Schema, businessIDSchema } from "../validation/schemas";
import businessRoutes from './business.route'
import { ContentfulStatusCode } from "hono/utils/http-status";

const router = new Hono();

router.post('/image-base64', 
  zValidator('json', base64Schema),
  tryCatch( async (c: Context) => {
  const { image } = await c.req.json()
  const r = await imageUpload(image)
  return c.json(r, r.statusCode as any)
}))

router.route('/business', businessRoutes)

router.get('/users/:business_id', zValidator('param', businessIDSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const { business_id } = await c.req.param();
    const r = await getUsers({business_id, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

export default router;