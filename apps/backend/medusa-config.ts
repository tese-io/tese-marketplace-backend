import { defineConfig, loadEnv } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  admin: {
    disable: true // Disable built-in admin - using separate admin-panel container
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // redisUrl feeds the Cache/EventBus/Workflows/Locking modules
    // below. When unset, Medusa falls back to in-memory fakes and logs
    // "redisUrl not found. A fake redis instance will be used." + the
    // "Local Event Bus installed. Not recommended for production."
    // warnings we hit on Railway staging first boot. Set REDIS_URL to
    // a real Redis (Railway private-network URL, or public URL with
    // password) to activate the Redis-backed modules.
    redisUrl: process.env.REDIS_URL,
    databaseDriverOptions: process.env.NODE_ENV === 'production' ? {
      connection: {
        ssl: {
          rejectUnauthorized: false
        }
      }
    } : undefined,
    cookieOptions: {
      secure: false,
      sameSite: 'lax'
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      // @ts-expect-error: vendorCors is not a valid config
      vendorCors: process.env.VENDOR_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret'
    }
  },
  plugins: [
    {
      resolve: '@mercurjs/b2c-core',
      options: {}
    },
    {
      resolve: '@mercurjs/commission',
      options: {}
    },
    // Algolia plugin only registers when both keys are actually present.
    // The plugin's AlgoliaModuleService constructor eagerly calls
    // algoliasearch(appId, apiKey), which throws
    // "Neither apiKey nor config.authenticator provided" on empty/undefined
    // and takes the whole boot down with it — no graceful fallback. Guarding
    // the registration here means: env vars set → search sync works;
    // env vars missing → Mercur still boots (search subscribers silently
    // no-op). Dev uses ALGOLIA_APP_ID=dummy/ALGOLIA_API_KEY=dummy which are
    // truthy and pass this guard, matching pre-guard behavior.
    ...(process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_API_KEY
      ? [
          {
            resolve: '@mercurjs/algolia',
            options: {
              apiKey: process.env.ALGOLIA_API_KEY,
              appId: process.env.ALGOLIA_APP_ID
            }
          }
        ]
      : []),
    {
      resolve: '@mercurjs/reviews',
      options: {}
    },
    {
      resolve: '@mercurjs/requests',
      options: {}
    },
    {
      resolve: '@mercurjs/resend',
      options: {}
    },
    {
      resolve: '@tese/connect',
      options: {}
    }
  ],
  modules: [
    // Redis-backed shared state modules. Only register when REDIS_URL
    // is set — otherwise Medusa falls back to its in-memory defaults
    // (fine for local dev, unsafe for staging/prod which has 18
    // subscribers + 3 cron jobs relying on shared state).
    ...(process.env.REDIS_URL
      ? [
          {
            resolve: '@medusajs/medusa/cache-redis',
            options: { redisUrl: process.env.REDIS_URL }
          },
          {
            resolve: '@medusajs/medusa/event-bus-redis',
            options: { redisUrl: process.env.REDIS_URL }
          },
          {
            resolve: '@medusajs/medusa/workflow-engine-redis',
            options: { redis: { url: process.env.REDIS_URL } }
          }
          // Note: no locking-redis here. That module needs to be wrapped
          // in a `@medusajs/medusa/locking` parent with a providers[]
          // array; standalone resolve fails with "No service found in
          // module Locking" during boot. For single-instance staging,
          // Medusa's default in-memory locking is fine (locks only need
          // to be shared across instances if we scale to >1 Mercur pod,
          // which isn't the case now). Revisit when scaling out.
        ]
      : []),
    ...(process.env.S3_ACCESS_KEY_ID
      ? [
          {
            resolve: "@medusajs/medusa/file",
            options: {
              providers: [
                {
                  resolve: '@medusajs/medusa/file-s3',
                  id: 's3',
                  options: {
                    file_url: process.env.S3_FILE_URL,
                    access_key_id: process.env.S3_ACCESS_KEY_ID,
                    secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                    region: process.env.S3_REGION,
                    bucket: process.env.S3_BUCKET,
                    endpoint: process.env.S3_ENDPOINT
                  }
                }
              ]
            }
          }
        ]
      : []),
    {
      // Explicit auth module. Once declared we must re-list every provider we
      // still want (emailpass) alongside the new tese-sso provider.
      resolve: '@medusajs/medusa/auth',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/auth-emailpass',
            id: 'emailpass'
          },
          {
            resolve: '@mercurjs/auth-tese-sso/providers/tese-sso',
            id: 'tese-sso',
            options: {
              teseBackendUrl: process.env.TESE_BACKEND_URL
            }
          },
          {
            resolve: '@mercurjs/auth-tese-sso/providers/tese-sso-seller',
            id: 'tese-sso-seller',
            options: {
              teseBackendUrl: process.env.TESE_BACKEND_URL
            }
          }
        ]
      }
    },
    // Stripe payment provider only registers when STRIPE_SECRET_API_KEY is set.
    // The @mercurjs/payment-stripe-connect provider constructor calls
    // `new Stripe(apiKey)` eagerly, and Stripe's SDK throws
    // "Neither apiKey nor config.authenticator provided" if apiKey is falsy —
    // which crashes the whole Medusa boot. Guarding registration the same way
    // as Algolia so a missing env var no-ops the payment module instead of
    // taking down the app. Payments won't work without this env var — this
    // guard is a safety net, not a substitute for setting STRIPE_SECRET_API_KEY.
    ...(process.env.STRIPE_SECRET_API_KEY
      ? [
          {
            resolve: '@medusajs/medusa/payment',
            options: {
              providers: [
                {
                  resolve:
                    '@mercurjs/payment-stripe-connect/providers/stripe-connect',
                  id: 'stripe-connect',
                  options: {
                    apiKey: process.env.STRIPE_SECRET_API_KEY,
                    webhookSecret:
                      process.env.STRIPE_PAYMENT_WEBHOOK_SECRET ??
                      process.env.STRIPE_WEBHOOK_SECRET
                  }
                }
              ]
            }
          }
        ]
      : []),
    {
      resolve: '@medusajs/medusa/notification',
      options: {
        providers: [
          {
            resolve: '@mercurjs/resend/providers/resend',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL
            }
          },
          {
            resolve: '@medusajs/medusa/notification-local',
            id: 'local',
            options: {
              channels: ['feed', 'seller_feed']
            }
          }
        ]
      }
    },
    {
      resolve: '@medusajs/index'
    }
  ]
})
