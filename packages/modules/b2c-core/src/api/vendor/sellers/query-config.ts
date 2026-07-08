export const vendorSellerFields = [
  "id",
  "store_status",
  "name",
  "handle",
  "description",
  "photo",
  "address_line",
  "city",
  "postal_code",
  "country_code",
  "tax_id",
  "website",
  "company_type",
  "is_verified",
];

export const vendorSellerQueryConfig = {
  list: {
    defaults: vendorSellerFields,
    isList: true,
  },
  retrieve: {
    defaults: vendorSellerFields,
    isList: false,
  },
};

export const vendorOnboardingFields = [
  "id",
  "seller_id",
  "store_information",
  "stripe_connection",
  "locations_shipping",
  "products",
  "created_at",
  "updated_at",
];

export const vendorOnboardingQueryConfig = {
  retrieve: {
    defaults: vendorOnboardingFields,
    isList: false,
  },
};
