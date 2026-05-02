/**
 * HTTP Client para comunicación inter-servicios
 * Maneja timeouts, retries, y errores
 */

import axios from 'axios';

const DEFAULT_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Cliente HTTP con reintentos automáticos
 */
class ServiceClient {
  constructor(baseURL, timeout = DEFAULT_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
    this.client = axios.create({
      baseURL,
      timeout
    });
  }

  /**
   * GET request con reintentos
   */
  async get(endpoint, config = {}, retries = MAX_RETRIES) {
    try {
      const response = await this.client.get(endpoint, config);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      if (retries > 0 && this._isRetryable(error)) {
        console.warn(
          `[Service] GET ${endpoint} failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`
        );
        await this._delay(RETRY_DELAY);
        return this.get(endpoint, config, retries - 1);
      }

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  /**
   * POST request con reintentos
   */
  async post(endpoint, data = {}, config = {}, retries = MAX_RETRIES) {
    try {
      const response = await this.client.post(endpoint, data, config);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      if (retries > 0 && this._isRetryable(error)) {
        console.warn(
          `[Service] POST ${endpoint} failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`
        );
        await this._delay(RETRY_DELAY);
        return this.post(endpoint, data, config, retries - 1);
      }

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, config = {}) {
    try {
      const response = await this.client.put(endpoint, data, config);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  /**
   * DELETE request
   */
  async delete(endpoint, config = {}) {
    try {
      const response = await this.client.delete(endpoint, config);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  /**
   * Verificar si error es reintentable
   */
  _isRetryable(error) {
    if (error.code === 'ECONNREFUSED') return true;
    if (error.code === 'ETIMEDOUT') return true;
    if (error.code === 'ENOTFOUND') return false;

    // No reintentar errores 4xx
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }

    return true;
  }

  /**
   * Delay para reintentos
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Factory para crear clientes pre-configurados
export function createServiceClient(serviceName, baseURL, timeout) {
  console.log(`[Service] Creating client for ${serviceName}`);
  return new ServiceClient(baseURL, timeout);
}

// Clientes pre-configurados para IA services
export const iaClients = {
  featureExtraction: null,
  inference: null,
  translation: null,
  frameProcessor: null,
  videoCall: null,
  websocket: null
};

export function initializeServiceClients() {
  iaClients.featureExtraction = new ServiceClient(
    process.env.IA_FEATURE_EXTRACTION_URL,
    parseInt(process.env.FEATURE_EXTRACTION_TIMEOUT || 15000)
  );

  iaClients.inference = new ServiceClient(
    process.env.IA_INFERENCE_URL,
    parseInt(process.env.INFERENCE_TIMEOUT || 10000)
  );

  iaClients.translation = new ServiceClient(
    process.env.IA_TRANSLATION_URL,
    parseInt(process.env.TRANSLATION_TIMEOUT || 5000)
  );

  if (process.env.FRAME_PROCESSOR_URL) {
    iaClients.frameProcessor = new ServiceClient(
      process.env.FRAME_PROCESSOR_URL,
      parseInt(process.env.FRAME_PROCESSOR_TIMEOUT || 10000)
    );
  }

  if (process.env.VIDEO_CALL_SERVICE_URL) {
    iaClients.videoCall = new ServiceClient(
      process.env.VIDEO_CALL_SERVICE_URL,
      parseInt(process.env.VIDEO_CALL_TIMEOUT || 8000)
    );
  }

  if (process.env.WEBSOCKET_SERVICE_URL) {
    iaClients.websocket = new ServiceClient(
      process.env.WEBSOCKET_SERVICE_URL,
      parseInt(process.env.WEBSOCKET_TIMEOUT || 5000)
    );
  }

  console.log('[Service] All clients initialized');
}

export { ServiceClient };
