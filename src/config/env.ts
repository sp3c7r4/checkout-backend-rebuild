import { config } from 'dotenv'
import z from 'zod'

config({ path: '.env' })

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  WEB_ORIGIN: z.string(),
  PORT: z.string(),
  OPENAI_API_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  BETTER_AUTH_SECRET: z.string().optional(),
  // public root origin of this API in production, e.g. https://api.example.com
  API_ORIGIN: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().default('deepseek-flash'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  DB_MEMORY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  AWS_REGION: z.string(),
  AWS_SECRET_KEY: z.string(),
  AWS_ACCESS_KEY: z.string(),
  AWS_S3_BUCKET_NAME: z.string(),
  GOOGLE_CREDENTIALS_PATH: z.string().optional(),
  TOKEN_PATH: z.string().optional(),
  CHECKOUT_MAIL: z.string(),
  IMAGE_PATH: z.string().optional(),
  CHECKOUT_MAIL_PASSWORD: z.string(),
  CHECKOUT_MAIL_PASSWORD2: z.string(),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  PAYSTACK_SECRET_KEY: z.string(),
})

export type Env = z.infer<typeof EnvSchema>

const env = EnvSchema.parse(process.env)

export default env;