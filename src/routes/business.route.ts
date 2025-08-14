import { zValidator } from '@hono/zod-validator';
import { Context, Hono } from 'hono';
import { businessAddressSchema, businessIDSchema, updateBusinessSchema } from '../validation/schemas';
import tryCatch from '../utils/TryCatch';
import { createBusiness, getBusiness, requestSpreadSheet, updateBusiness } from '../controller/business.controller';
import { ContentfulStatusCode } from 'hono/utils/http-status';

const router = new Hono()

router.get('/', tryCatch(async (c: Context) => {
    const business_id = c.get("business_id")
    const r = await getBusiness(business_id)
    console.log(r)
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.post('/create', zValidator('json', businessAddressSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const data = await c.req.json();
    const r = await createBusiness({...data, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.post('/update', zValidator('json', updateBusinessSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const data = await c.req.json();
    console.log({...data, image: true})
    const r = await updateBusiness({...data, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

router.post('/request-sheet', zValidator('json', businessIDSchema), tryCatch(async (c: Context) => {
    const admin_id = c.get("admin_id")
    const data = await c.req.json();
    const r = await requestSpreadSheet({...data, admin_id })
    return c.json(r, r.statusCode as ContentfulStatusCode)
}))

export default router;