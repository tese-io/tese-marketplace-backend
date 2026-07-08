import { z } from 'zod'

export const AdminToggleProvider = z.object({
  enabled: z.boolean()
})

export const AdminConnectTemplate = z.object({
  name: z.string(),
  description: z.string().optional(),
  config: z.record(z.unknown())
})

export type AdminToggleProviderType = z.infer<typeof AdminToggleProvider>
export type AdminConnectTemplateType = z.infer<typeof AdminConnectTemplate>
