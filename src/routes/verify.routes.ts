import { Context, Hono } from "hono";
import { imageUpload } from "../controller/user.controller";
import { zValidator } from '@hono/zod-validator'
import tryCatch from "../utils/TryCatch";
import { base64Schema, emailSchema } from "../validation/schemas";
import { Email } from "../controller/validator.controller";

const router = new Hono();

router.post('/email', zValidator('json', emailSchema),
  tryCatch( async (c: Context) => {
  const { email } = await c.req.json()
  const r = await Email(email)
  return c.json(r, r.statusCode as any)
}))

export default router;