import { TeseBrandedLayout, teseHeadingStyle } from "./tese-branded-layout"

interface EmailTemplateProps {
  data: {
		user_name: string,
		store_name: string
		storefront_url: string
	}
}

export const SellerAccountSubmissionEmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({ data }) => {
  return (
    <TeseBrandedLayout>
      <h1 style={teseHeadingStyle}>Hello, {data.user_name} 👋</h1>
      <p>We are thrilled about your interest in collaborating with us.</p>
      <p>
        Your application is currently being reviewed by our team. Please expect a response within [three] business days.
        If your submission meets our criteria and is accepted, you will receive a confirmation email from us.
      </p>
      <p>
        In the meantime, if you have any questions or need further assistance, feel free to reach out to us.
      </p>
      <div style={{ marginTop: 32 }}>
        <div>Best regards,</div>
        <div style={{ fontWeight: 600 }}>The {data.store_name} Team</div>
        <div style={{ color: '#888', marginTop: 4 }}>{data.storefront_url}</div>
      </div>
    </TeseBrandedLayout>
  )
}
