import { MedusaService } from '@medusajs/framework/utils'

import { SellerCertification } from './models/seller-certification'

class SellerCertificationsModuleService extends MedusaService({
  SellerCertification
}) {}

export default SellerCertificationsModuleService
