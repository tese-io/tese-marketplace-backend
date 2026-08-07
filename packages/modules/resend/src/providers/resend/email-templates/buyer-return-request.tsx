import * as React from "react"
import { SimpleTransactionalEmailTemplate } from "./simple-transactional"

interface EmailTemplateProps {
  data: {
    title: string
    body: string
    cta_label?: string
    cta_url?: string
    store_name?: string
    storefront_url?: string
  }
}

export const BuyerReturnRequestEmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({ data }) => {
  return <SimpleTransactionalEmailTemplate data={data} />
}
