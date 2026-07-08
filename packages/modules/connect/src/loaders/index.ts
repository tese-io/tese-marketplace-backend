import type { MedusaContainer } from '@medusajs/framework/types'

// Default connector providers are seeded via migration. Avoid calling the
// module service here — loaders run before the module DB manager is ready.
export default async function connectLoader (_container: MedusaContainer) {}
