import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import env from "../src/config/env";
import adminRoutes from '../src/routes/admin.route'
import verifyRoutes from '../src/routes/verify.routes'
import { auth } from "../auth";
import chalk from 'chalk'
import middleMan from "../src/routes/middleware";

const app = new Hono();
const api_version = `/api/v1`

app.use('/*', cors({
  origin: [env.WEB_ORIGIN, 'http://localhost:5174', 'http://localhost:5173'],
  credentials: true
}))

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
app.route(`${api_version}/webhook/`, webhookRoutes)
// app.route(`${api_version}/admin`, adminRoute)

app.get('/', (c: Context) => {
  return c.json({ msg: `Server running at ${env.PORT}...😊`})
})

export default {
  PORT: env.PORT,
  fetch: app.fetch
}