import { z } from "zod";

import { createFindParams } from "@medusajs/medusa/api/utils/validators";

import { buildHostAddress, Hosts, StoreStatus } from "@mercurjs/framework";

// Only http(s) — a stored javascript:/data: URL is an XSS vector when a
// panel renders it as an anchor href (React does not sanitize href).
const httpUrl = z
  .string()
  .url()
  .refine(
    (value) => {
      try {
        const { protocol } = new URL(value);
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Website must be an http(s) URL" }
  );

export type AdminSellerParamsType = z.infer<typeof AdminSellerParams>;
export const AdminSellerParams = createFindParams({
  offset: 0,
  limit: 50,
});

export type AdminGetSellerProductsParamsType = z.infer<
  typeof AdminGetSellerProductsParams
>;
export const AdminGetSellerProductsParams = createFindParams({
  offset: 0,
  limit: 50,
});

export type AdminGetSellerOrdersParamsType = z.infer<
  typeof AdminGetSellerOrdersParams
>;
export const AdminGetSellerOrdersParams = createFindParams({
  offset: 0,
  limit: 50,
});

export type AdminGetSellerCustomerGroupsParamsType = z.infer<
  typeof AdminGetSellerCustomerGroupsParams
>;
export const AdminGetSellerCustomerGroupsParams = createFindParams({
  offset: 0,
  limit: 50,
});

export type AdminUpdateSellerType = z.infer<typeof AdminUpdateSeller>;
export const AdminUpdateSeller = z
  .object({
    name: z
      .preprocess((val: string) => val.trim(), z.string().min(4))
      .optional(),
    description: z.string().optional(),
    photo: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address_line: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country_code: z.string().optional(),
    tax_id: z.string().optional(),
    store_status: z.nativeEnum(StoreStatus).optional(),
    is_verified: z.boolean().optional(),
    website: httpUrl.optional().or(z.literal("")),
    company_type: z
      .enum([
        "manufacturer",
        "distributor",
        "wholesaler",
        "service_provider",
        "startup",
        "other",
      ])
      .optional(),
  })
  .strict();

export type AdminInviteSellerType = z.infer<typeof AdminInviteSeller>;
export const AdminInviteSeller = z.object({
  email: z.string().email(),
  registration_url: z
    .string()
    .default(buildHostAddress(Hosts.VENDOR_PANEL, "/register").toString()),
});
