import { TeseBrandedLayout, teseCtaStyle, teseHeadingStyle } from "./tese-branded-layout"

interface EmailTemplateProps {
  data: {
    url: string
    store_name: string
    storefront_url: string
  }
}

export const NewSellerInviteEmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({ data }) => {
  return (
    <TeseBrandedLayout>
      <h1 style={teseHeadingStyle}>
        You are invited to sell on {data.store_name}!
      </h1>
      <p style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
        To join the platform, please accept the invitation.<br />
      </p>
      <div style={{ marginBottom: 24 }}>
        <a href={`${data.url}`} style={teseCtaStyle}>
          Accept Invitation
        </a>
        <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>
          If you can’t click the button, here’s your link: <br />
          <span style={{ color: '#0070f3' }}>{`${data.url}`}</span>
        </div>
      </div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
        You received this email because you were invited to join the {data.store_name} marketplace.<br />
        If you have any questions, please contact our support team.
      </div>
      <div style={{ marginTop: 32 }}>
        <div>Best regards,</div>
        <div style={{ fontWeight: 600 }}>The {data.store_name} Team</div>
        <div style={{ color: '#888', marginTop: 4 }}>{data.storefront_url}</div>
      </div>
    </TeseBrandedLayout>
  )
}
