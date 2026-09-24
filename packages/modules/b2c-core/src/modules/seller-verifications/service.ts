import { MedusaService } from '@medusajs/framework/utils'

import { SellerVerification } from './models/seller-verification'

class SellerVerificationsModuleService extends MedusaService({
  SellerVerification
}) {}

export default SellerVerificationsModuleService
