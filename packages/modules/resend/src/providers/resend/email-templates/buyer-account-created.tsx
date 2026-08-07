import { TeseBrandedLayout, teseCtaStyle, teseHeadingStyle } from "./tese-branded-layout"

interface EmailTemplateProps {
  data: {
    user_name: string;
    store_name: string;
    storefront_url: string;
  };
}

export const BuyerAccountCreatedEmailTemplate: React.FC<
  Readonly<EmailTemplateProps>
> = ({ data }) => {
  return (
    <TeseBrandedLayout>
      <h1 style={teseHeadingStyle}>
        Welcome to {data.store_name}, {data.user_name}!
      </h1>
      <p style={{ fontSize: "1.1rem", marginBottom: "24px" }}>
        We’re excited to have you join us on this journey.
        <br />
        Your account has been created successfully.
      </p>
      <div style={{ margin: "24px 0" }}>
        <a href={data.storefront_url} style={teseCtaStyle}>
          Visit {data.store_name}
        </a>
      </div>
      <div style={{ marginTop: 32 }}>
        <div>Best regards,</div>
        <div style={{ fontWeight: 600 }}>The {data.store_name} Team</div>
        <div style={{ color: "#888", marginTop: 4 }}>{data.storefront_url}</div>
      </div>
    </TeseBrandedLayout>
  );
};
