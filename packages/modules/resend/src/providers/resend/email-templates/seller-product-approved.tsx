import { TeseBrandedLayout, teseHeadingStyle } from "./tese-branded-layout"

interface EmailTemplateProps {
  data: {
    product_title: string
    store_name: string
    storefront_url: string
  }
}

export const SellerProductApprovedEmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({ data }) => {
  return (
    <TeseBrandedLayout>
      <h1 style={teseHeadingStyle}>
        Hello <span role="img" aria-label="wave">👋</span>
      </h1>
      <p style={{ fontSize: '1.1rem', marginBottom: 16 }}>
        We’re happy to let you know that your product {data.product_title} has been approved by the administrator.
      </p>
      <div style={{ marginTop: 32 }}>
        <div>Best regards,</div>
        <div style={{ fontWeight: 600 }}>The {data.store_name} Team</div>
        <div style={{ color: '#888', marginTop: 4 }}>{data.storefront_url}</div>
      </div>
    </TeseBrandedLayout>
  )
}
