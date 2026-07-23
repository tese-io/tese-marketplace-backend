import { Module } from '@medusajs/framework/utils'

import SellerCertificationsModuleService from './service'

export const SELLER_CERTIFICATIONS_MODULE = 'sellerCertifications'
export { SellerCertificationsModuleService }

export default Module(SELLER_CERTIFICATIONS_MODULE, {
  service: SellerCertificationsModuleService
})
