import { defineLink } from '@medusajs/framework/utils'

import SellerModule from '../modules/seller'
import SellerVerificationsModule from '../modules/seller-verifications'

export default defineLink(SellerModule.linkable.seller, {
  linkable: SellerVerificationsModule.linkable.sellerVerification,
  isList: true
})
