import { Context, Hono } from "hono";
import { getUsers, imageUpload } from "../controller/user.controller";
import { getCarts } from "../controller/cart.controller";
import { getUserOrders } from "../controller/order.controller";
import { getUserPayments } from "../controller/payment.controller";
import { syncSheet } from "../controller/business.controller";
import {
  createProduct,
  deleteProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
} from "../controller/product.controller";
import {
  getSettingsByBusinessId,
  updateSettings,
} from "../controller/settings.controller";
import { zValidator } from '@hono/zod-validator'
import tryCatch from "../utils/TryCatch";
import {
  base64Schema,
  businessIDSchema,
  createProductSchema,
  productDeleteSchema,
  productIDSchema,
  productUpdateSchema,
  settingsSchema,
  syncSheetSchema,
} from "../validation/schemas";
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

router.post('/business/sync-sheet', zValidator('json', syncSheetSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const data = await c.req.json();
    const r = await syncSheet({ ...data, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.get('/users/:business_id', zValidator('param', businessIDSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const { business_id } = await c.req.param();
    const r = await getUsers({business_id, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.get('/products/:business_id', zValidator('param', businessIDSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const { business_id } = c.req.param();
    const r = await getProducts({ business_id, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.get('/products/:business_id/:product_id', zValidator('param', productDeleteSchema), tryCatch(async (c: Context) => {
    const { business_id, product_id } = c.req.param();
    const r = await getSingleProduct(business_id, product_id)
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.post('/products', zValidator('json', createProductSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const data = await c.req.json();
    const r = await createProduct({ ...data, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.post('/products/:product_id', zValidator('param', productIDSchema), zValidator('json', productUpdateSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const { product_id } = c.req.param();
    const data = await c.req.json();
    const r = await updateProduct({ ...data, product_id, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.delete('/products/:business_id/:product_id', zValidator('param', productDeleteSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const { business_id, product_id } = c.req.param();
    const r = await deleteProduct({ business_id, product_id, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.get('/settings/:business_id', zValidator('param', businessIDSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const { business_id } = c.req.param();
    const r = await getSettingsByBusinessId({ business_id, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.post('/settings/update', zValidator('json', settingsSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const data = await c.req.json();
    const r = await updateSettings({ ...data, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.get('/carts/:business_id', zValidator('param', businessIDSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const { business_id } = c.req.param();
    const r = await getCarts(admin_id, business_id)
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.get('/orders/:business_id', zValidator('param', businessIDSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const { business_id } = c.req.param();
    const r = await getUserOrders(admin_id, business_id)
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.get('/payments/:business_id', zValidator('param', businessIDSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const { business_id } = c.req.param();
    const r = await getUserPayments(admin_id, business_id)
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

export default router;
