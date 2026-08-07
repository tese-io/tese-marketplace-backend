import { defineLink } from '@medusajs/framework/utils'

import SellerModule from '../modules/seller'
import SellerCertificationsModule from '../modules/seller-certifications'

export default defineLink(SellerModule.linkable.seller, {
  linkable: SellerCertificationsModule.linkable.sellerCertification,
  isList: true
})
