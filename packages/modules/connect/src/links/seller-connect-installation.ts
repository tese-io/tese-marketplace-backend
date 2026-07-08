import { defineLink } from '@medusajs/framework/utils'

import { SellerModuleSellerLinkable } from '@mercurjs/framework'

import ConnectModule from '../modules/connect'

export default defineLink(SellerModuleSellerLinkable, {
  linkable: ConnectModule.linkable.connectorInstallation,
  isList: true
})
