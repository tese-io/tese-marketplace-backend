import { TeseBrandedLayout, teseCtaStyle, teseHeadingStyle } from "./tese-branded-layout"

interface EmailTemplateProps {
  data: {
    request_address: string,
    seller_name: string
    store_name: string
    storefront_url: string
  }
}

export const AdminSellerRequestCreatedEmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({ data }) => {
  return (
    <TeseBrandedLayout>
      <h1 style={teseHeadingStyle}>
        Hello, <span role="img" aria-label="wave">👋</span>
      </h1>
      <p style={{ fontSize: '1.1rem', marginBottom: 16 }}>
        {data.seller_name} has requested to join the platform. Please review the request and approve it in admin panel.
      </p>

      <div style={{ margin: "24px 0" }}>
        <a href={data.request_address} style={teseCtaStyle}>
          Review Request
        </a>
      </div>
      <div style={{ marginTop: 32 }}>
        <div>Best regards,</div>
        <div style={{ fontWeight: 600 }}>The {data.store_name} Team</div>
        <div style={{ color: '#888', marginTop: 4 }}>{data.storefront_url}</div>
      </div>
    </TeseBrandedLayout>
  )
}
