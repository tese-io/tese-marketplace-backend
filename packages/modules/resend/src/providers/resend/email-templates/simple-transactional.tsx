import * as React from "react"
import { TeseBrandedLayout, teseCtaStyle, teseHeadingStyle } from "./tese-branded-layout"

type Props = {
  data: {
    title: string
    body: string
    cta_label?: string
    cta_url?: string
    store_name?: string
    storefront_url?: string
  }
}

export const SimpleTransactionalEmailTemplate: React.FC<Readonly<Props>> = ({ data }) => {
  return (
    <TeseBrandedLayout>
      <h1 style={teseHeadingStyle}>{data.title}</h1>
      <p style={{ margin: "0 0 16px", whiteSpace: "pre-wrap" }}>{data.body}</p>
      {data.cta_label && data.cta_url ? (
        <a href={data.cta_url} style={teseCtaStyle}>{data.cta_label}</a>
      ) : null}
    </TeseBrandedLayout>
  )
}
