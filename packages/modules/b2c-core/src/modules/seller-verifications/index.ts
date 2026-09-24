import { Module } from '@medusajs/framework/utils'

import SellerVerificationsModuleService from './service'

export const SELLER_VERIFICATIONS_MODULE = 'sellerVerifications'
export { SellerVerificationsModuleService }

export default Module(SELLER_VERIFICATIONS_MODULE, {
  service: SellerVerificationsModuleService
})
