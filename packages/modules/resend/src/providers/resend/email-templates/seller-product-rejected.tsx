import { TeseBrandedLayout, teseHeadingStyle } from "./tese-branded-layout"

interface EmailTemplateProps {
  data: {
    product_title: string
    store_name: string
    storefront_url: string
  }
}

export const SellerProductRejectedEmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({ data }) => {
  return (
    <TeseBrandedLayout>
      <h1 style={teseHeadingStyle}>
        Hello <span role="img" aria-label="wave">👋</span>
      </h1>
      <h1 style={teseHeadingStyle}>
        We regret to inform you that your product {data.product_title} has been rejected.
      </h1>
      <div style={{ marginTop: 32 }}>
        <div>Best regards,</div>
        <div style={{ fontWeight: 600 }}>The {data.store_name} Team</div>
        <div style={{ color: '#888', marginTop: 4 }}>{data.storefront_url}</div>
      </div>
    </TeseBrandedLayout>
  )
}
