import { drizzle } from 'drizzle-orm/node-postgres';
import env from '../config/env';
import * as schema from './schema'
import * as authschema from '../../auth-schema'


export const db = drizzle({
  connection: env.DATABASE_URL!,
  schema: { ...schema, ...authschema }
});
 
// await db.execute('select 1');