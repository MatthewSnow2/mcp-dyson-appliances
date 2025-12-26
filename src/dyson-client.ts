/**
 * Dyson Cloud API Client
 *
 * Authenticates with Dyson cloud and controls devices.
 * Based on Dyson API patterns from open-source projects.
 */

// Dyson API endpoints by region
const DYSON_API_HOSTS: Record<string, string> = {
  US: 'appapi.cp.dyson.com',
  GB: 'appapi.cp.dyson.co.uk',
  DE: 'appapi.cp.dyson.de',
  FR: 'appapi.cp.dyson.fr',
  AU: 'appapi.cp.dyson.com.au',
  CN: 'appapi.cp.dyson.cn',
};

// Device types and their product codes
const DEVICE_TYPES: Record<string, string> = {
  '358': 'Pure Humidify+Cool',
  '438': 'Pure Cool Formaldehyde',
  '455': 'Pure Hot+Cool Link',
  '469': 'Pure Cool Link Desk',
  '475': 'Pure Cool Link Tower',
  '520': 'Pure Cool',
  '527': 'Pure Hot+Cool',
};

export interface DysonDevice {
  serial: string;
  name: string;
  productType: string;
  productTypeName: string;
  connectionType: string;
  localCredentials?: string;
}

export interface DeviceStatus {
  serial: string;
  name: string;
  power: boolean;
  fanSpeed: string;
  oscillation: boolean;
  nightMode: boolean;
  autoMode: boolean;
  airQuality: AirQuality | null;
}

export interface AirQuality {
  pm25: number;
  pm10: number;
  voc: number;
  no2: number;
  humidity: number;
  temperature: number;
}

export interface DysonState {
  fpwr: string;  // Fan power: ON/OFF
  fnsp: string;  // Fan speed: 0001-0010 or AUTO
  oson: string;  // Oscillation: ON/OFF
  nmod: string;  // Night mode: ON/OFF
  auto: string;  // Auto mode: ON/OFF
  // Environmental data
  hact?: string; // Humidity
  tact?: string; // Temperature (Kelvin * 10)
  pact?: string; // Dust/PM2.5
  vact?: string; // VOC
  pm25?: string; // PM2.5
  pm10?: string; // PM10
  noxl?: string; // NO2
}

export class DysonClient {
  private email: string;
  private password: string;
  private country: string;
  private apiHost: string;
  private authToken: string | null = null;
  private devices: DysonDevice[] = [];

  constructor(email: string, password: string, country: string = 'US') {
    this.email = email;
    this.password = password;
    this.country = country.toUpperCase();
    this.apiHost = DYSON_API_HOSTS[this.country] || DYSON_API_HOSTS['US'];
  }

  /**
   * Authenticate with Dyson cloud API
   */
  async authenticate(): Promise<void> {
    const response = await fetch(`https://${this.apiHost}/v1/userregistration/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Email: this.email,
        Password: this.password,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Dyson credentials');
      }
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.authToken = data.Account;
  }

  /**
   * Get list of devices from Dyson cloud
   */
  async getDevices(): Promise<DysonDevice[]> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const response = await fetch(`https://${this.apiHost}/v2/provisioningservice/manifest`, {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, re-authenticate
        this.authToken = null;
        await this.authenticate();
        return this.getDevices();
      }
      throw new Error(`Failed to get devices: ${response.status}`);
    }

    const data = await response.json();
    this.devices = data.map((device: any) => ({
      serial: device.Serial,
      name: device.Name || `Dyson ${device.ProductType}`,
      productType: device.ProductType,
      productTypeName: DEVICE_TYPES[device.ProductType] || 'Unknown Dyson Device',
      connectionType: device.ConnectionType,
      localCredentials: device.LocalCredentials,
    }));

    return this.devices;
  }

  /**
   * Get device by ID or return first device
   */
  async getDevice(deviceId?: string): Promise<DysonDevice> {
    if (this.devices.length === 0) {
      await this.getDevices();
    }

    if (deviceId) {
      const device = this.devices.find(d => d.serial === deviceId);
      if (!device) {
        throw new Error(`Device not found: ${deviceId}`);
      }
      return device;
    }

    if (this.devices.length === 0) {
      throw new Error('No Dyson devices found in account');
    }

    return this.devices[0];
  }

  /**
   * Get current device status
   */
  async getDeviceStatus(deviceId?: string): Promise<DeviceStatus> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const device = await this.getDevice(deviceId);

    const response = await fetch(
      `https://${this.apiHost}/v2/provisioningservice/devices/${device.serial}/state`,
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get device status: ${response.status}`);
    }

    const state: DysonState = await response.json();

    return {
      serial: device.serial,
      name: device.name,
      power: state.fpwr === 'ON',
      fanSpeed: this.parseFanSpeed(state.fnsp),
      oscillation: state.oson === 'ON',
      nightMode: state.nmod === 'ON',
      autoMode: state.auto === 'ON',
      airQuality: this.parseAirQuality(state),
    };
  }

  /**
   * Set device state
   */
  async setDeviceState(deviceId: string | undefined, state: Partial<DysonState>): Promise<DeviceStatus> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const device = await this.getDevice(deviceId);

    const response = await fetch(
      `https://${this.apiHost}/v2/provisioningservice/devices/${device.serial}/state`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to set device state: ${response.status}`);
    }

    // Return updated status
    return this.getDeviceStatus(device.serial);
  }

  /**
   * Set fan speed
   */
  async setFanSpeed(deviceId: string | undefined, speed: string): Promise<DeviceStatus> {
    const normalizedSpeed = speed.toUpperCase();

    let fnsp: string;
    let auto: string = 'OFF';

    if (normalizedSpeed === 'AUTO') {
      fnsp = 'AUTO';
      auto = 'ON';
    } else {
      const speedNum = parseInt(speed, 10);
      if (isNaN(speedNum) || speedNum < 1 || speedNum > 10) {
        throw new Error('Fan speed must be 1-10 or "auto"');
      }
      fnsp = speedNum.toString().padStart(4, '0');
    }

    return this.setDeviceState(deviceId, { fnsp, auto, fpwr: 'ON' });
  }

  /**
   * Set oscillation
   */
  async setOscillation(deviceId: string | undefined, enabled: boolean): Promise<DeviceStatus> {
    return this.setDeviceState(deviceId, { oson: enabled ? 'ON' : 'OFF' });
  }

  /**
   * Set night mode
   */
  async setNightMode(deviceId: string | undefined, enabled: boolean): Promise<DeviceStatus> {
    return this.setDeviceState(deviceId, { nmod: enabled ? 'ON' : 'OFF' });
  }

  /**
   * Get air quality readings
   */
  async getAirQuality(deviceId?: string): Promise<AirQuality> {
    const status = await this.getDeviceStatus(deviceId);

    if (!status.airQuality) {
      throw new Error('Air quality data not available for this device');
    }

    return status.airQuality;
  }

  /**
   * Parse fan speed from Dyson format
   */
  private parseFanSpeed(fnsp: string): string {
    if (fnsp === 'AUTO') {
      return 'auto';
    }
    return parseInt(fnsp, 10).toString();
  }

  /**
   * Parse air quality data from device state
   */
  private parseAirQuality(state: DysonState): AirQuality | null {
    // Check if any air quality data is available
    if (!state.pm25 && !state.pact && !state.hact) {
      return null;
    }

    return {
      pm25: state.pm25 ? parseInt(state.pm25, 10) : (state.pact ? parseInt(state.pact, 10) : 0),
      pm10: state.pm10 ? parseInt(state.pm10, 10) : 0,
      voc: state.vact ? parseInt(state.vact, 10) : 0,
      no2: state.noxl ? parseInt(state.noxl, 10) : 0,
      humidity: state.hact ? parseInt(state.hact, 10) : 0,
      temperature: state.tact ? this.kelvinToCelsius(parseInt(state.tact, 10) / 10) : 0,
    };
  }

  /**
   * Convert Kelvin to Celsius
   */
  private kelvinToCelsius(kelvin: number): number {
    return Math.round((kelvin - 273.15) * 10) / 10;
  }

  /**
   * Format temperature for display
   */
  static formatTemperature(celsius: number, unit: 'C' | 'F' = 'C'): string {
    if (unit === 'F') {
      return `${Math.round(celsius * 9/5 + 32)}°F`;
    }
    return `${celsius}°C`;
  }

  /**
   * Get air quality index description
   */
  static getAirQualityLevel(pm25: number): string {
    if (pm25 <= 12) return 'Good';
    if (pm25 <= 35) return 'Moderate';
    if (pm25 <= 55) return 'Unhealthy for Sensitive Groups';
    if (pm25 <= 150) return 'Unhealthy';
    if (pm25 <= 250) return 'Very Unhealthy';
    return 'Hazardous';
  }
}
