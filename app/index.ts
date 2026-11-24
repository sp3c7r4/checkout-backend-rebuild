import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import env from "../src/config/env";
import adminRoutes from '../src/routes/admin.route'
import verifyRoutes from '../src/routes/verify.routes'
import webhookRoutes from '../src/routes/webhook.route'
import marketplaceRoutes, { marketplaceHandlers } from '../src/routes/marketplace.route'
import { imageUpload } from '../src/controller/user.controller'
import { base64Schema } from '../src/validation/schemas'
import { zValidator } from '@hono/zod-validator'
import tryCatch from '../src/utils/TryCatch'
import { auth } from "../auth";
import chalk from 'chalk'
import middleMan from "../src/routes/middleware";

const app = new Hono();
const api_version = `/api/v1`

app.use('/*', cors({
  origin:
    process.env.NODE_ENV === 'production'
      ? [env.WEB_ORIGIN, env.API_ORIGIN].filter(Boolean)
      : [env.WEB_ORIGIN, 'http://localhost:5174', 'http://localhost:5173'],
  credentials: true
}))

// Hono's csrf only inspects form-encoded/multipart/text bodies, so JSON API calls
// are unaffected. AWS Marketplace posts a form cross-site, so that one route is exempt.
const csrfGuard = csrf();
const csrfExempt = new Set(["/", `${api_version}/marketplace/fulfillment`]);
app.use('*', async (c, next) => {
  if (csrfExempt.has(c.req.path)) return next();
  return csrfGuard(c, next);
});

app.use('*', async (c, next) => {
  const methodColor = c.req.method === 'GET' ? chalk.green : chalk.red;
  console.log(`${methodColor(`[${c.req.method}]`)} ${chalk.blue(`${c.req.path}`)}`)
  await next()
})

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.use(middleMan)
app.route(`${api_version}/admin`, adminRoutes)
app.route(`${api_version}/validate`, verifyRoutes)
app.post(`${api_version}/user/image-base64`, zValidator('json', base64Schema), tryCatch(async (c) => {
  const { image } = await c.req.json()
  const r = await imageUpload(image)
  return c.json(r, r.statusCode as any)
}))
app.route(`${api_version}/webhook/`, webhookRoutes)
app.route(`${api_version}/marketplace`, marketplaceRoutes)
// app.route(`${api_version}/admin`, adminRoute)

// The AWS Marketplace fulfillment URL is the site root: the edge forwards POST / here.
app.post('/', marketplaceHandlers.fulfillment);

app.get('/', (c: Context) => {
  return c.json({ msg: `Server running at ${env.PORT}...😊`})
})

export default app