import { Module } from '@medusajs/framework/utils'

import ConnectModuleService from './service'
import { CONNECT_MODULE } from './constants'

export { ConnectModuleService, CONNECT_MODULE }
export * from './constants'

export default Module(CONNECT_MODULE, {
  service: ConnectModuleService
})
