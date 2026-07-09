import { GatewayManager } from '../gateway/manager';
import { CoreServices } from './types';

let _coreServices: CoreServices | null = null;
let _gatewayManager: GatewayManager | null = null;

export function setGlobalServices(services: CoreServices) {
  _coreServices = services;
  _gatewayManager = services.gatewayManager;
}

export function getGatewayManager(): GatewayManager {
  if (!_gatewayManager) {
    throw new Error('GatewayManager has not been initialized yet.');
  }
  return _gatewayManager;
}

export function getCoreServices(): CoreServices {
  if (!_coreServices) {
    throw new Error('CoreServices have not been initialized yet.');
  }
  return _coreServices;
}
