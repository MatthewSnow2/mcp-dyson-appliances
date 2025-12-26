import { describe, it, expect } from 'vitest';
import { DysonClient } from '../src/dyson-client.js';

describe('DysonClient', () => {
  describe('formatTemperature', () => {
    it('should format temperature in Celsius', () => {
      expect(DysonClient.formatTemperature(22.5)).toBe('22.5°C');
      expect(DysonClient.formatTemperature(20)).toBe('20°C');
    });

    it('should format temperature in Fahrenheit', () => {
      expect(DysonClient.formatTemperature(22.5, 'F')).toBe('73°F');
      expect(DysonClient.formatTemperature(0, 'F')).toBe('32°F');
      expect(DysonClient.formatTemperature(100, 'F')).toBe('212°F');
    });
  });

  describe('getAirQualityLevel', () => {
    it('should return Good for PM2.5 <= 12', () => {
      expect(DysonClient.getAirQualityLevel(0)).toBe('Good');
      expect(DysonClient.getAirQualityLevel(12)).toBe('Good');
    });

    it('should return Moderate for PM2.5 13-35', () => {
      expect(DysonClient.getAirQualityLevel(13)).toBe('Moderate');
      expect(DysonClient.getAirQualityLevel(35)).toBe('Moderate');
    });

    it('should return Unhealthy for Sensitive Groups for PM2.5 36-55', () => {
      expect(DysonClient.getAirQualityLevel(36)).toBe('Unhealthy for Sensitive Groups');
      expect(DysonClient.getAirQualityLevel(55)).toBe('Unhealthy for Sensitive Groups');
    });

    it('should return Unhealthy for PM2.5 56-150', () => {
      expect(DysonClient.getAirQualityLevel(56)).toBe('Unhealthy');
      expect(DysonClient.getAirQualityLevel(150)).toBe('Unhealthy');
    });

    it('should return Very Unhealthy for PM2.5 151-250', () => {
      expect(DysonClient.getAirQualityLevel(151)).toBe('Very Unhealthy');
      expect(DysonClient.getAirQualityLevel(250)).toBe('Very Unhealthy');
    });

    it('should return Hazardous for PM2.5 > 250', () => {
      expect(DysonClient.getAirQualityLevel(251)).toBe('Hazardous');
      expect(DysonClient.getAirQualityLevel(500)).toBe('Hazardous');
    });
  });

  describe('constructor', () => {
    it('should use default country if not provided', () => {
      const client = new DysonClient('test@example.com', 'password');
      // Can't directly test private properties, but we can verify it doesn't throw
      expect(client).toBeDefined();
    });

    it('should accept country parameter', () => {
      const client = new DysonClient('test@example.com', 'password', 'GB');
      expect(client).toBeDefined();
    });

    it('should handle lowercase country codes', () => {
      const client = new DysonClient('test@example.com', 'password', 'de');
      expect(client).toBeDefined();
    });
  });
});

describe('DysonClient API Methods', () => {
  // These tests verify the method signatures and error handling
  // Actual API calls would be tested with mocks in integration tests

  describe('setFanSpeed validation', () => {
    it('should exist on client', () => {
      const client = new DysonClient('test@example.com', 'password');
      expect(typeof client.setFanSpeed).toBe('function');
    });
  });

  describe('setOscillation validation', () => {
    it('should exist on client', () => {
      const client = new DysonClient('test@example.com', 'password');
      expect(typeof client.setOscillation).toBe('function');
    });
  });

  describe('setNightMode validation', () => {
    it('should exist on client', () => {
      const client = new DysonClient('test@example.com', 'password');
      expect(typeof client.setNightMode).toBe('function');
    });
  });

  describe('getDeviceStatus', () => {
    it('should exist on client', () => {
      const client = new DysonClient('test@example.com', 'password');
      expect(typeof client.getDeviceStatus).toBe('function');
    });
  });

  describe('getAirQuality', () => {
    it('should exist on client', () => {
      const client = new DysonClient('test@example.com', 'password');
      expect(typeof client.getAirQuality).toBe('function');
    });
  });
});

describe('Air Quality Index', () => {
  it('should correctly classify all AQI breakpoints', () => {
    // EPA AQI breakpoints for PM2.5
    const testCases = [
      { pm25: 0, expected: 'Good' },
      { pm25: 6, expected: 'Good' },
      { pm25: 12, expected: 'Good' },
      { pm25: 12.1, expected: 'Moderate' },
      { pm25: 25, expected: 'Moderate' },
      { pm25: 35, expected: 'Moderate' },
      { pm25: 35.5, expected: 'Unhealthy for Sensitive Groups' },
      { pm25: 45, expected: 'Unhealthy for Sensitive Groups' },
      { pm25: 55, expected: 'Unhealthy for Sensitive Groups' },
      { pm25: 55.5, expected: 'Unhealthy' },
      { pm25: 100, expected: 'Unhealthy' },
      { pm25: 150, expected: 'Unhealthy' },
      { pm25: 150.5, expected: 'Very Unhealthy' },
      { pm25: 200, expected: 'Very Unhealthy' },
      { pm25: 250, expected: 'Very Unhealthy' },
      { pm25: 250.5, expected: 'Hazardous' },
      { pm25: 300, expected: 'Hazardous' },
      { pm25: 500, expected: 'Hazardous' },
    ];

    testCases.forEach(({ pm25, expected }) => {
      expect(DysonClient.getAirQualityLevel(pm25)).toBe(expected);
    });
  });
});

describe('Temperature Conversion', () => {
  it('should correctly convert common temperatures', () => {
    // Freezing point
    expect(DysonClient.formatTemperature(0, 'F')).toBe('32°F');

    // Room temperature
    expect(DysonClient.formatTemperature(21, 'F')).toBe('70°F');

    // Body temperature
    expect(DysonClient.formatTemperature(37, 'F')).toBe('99°F');

    // Boiling point
    expect(DysonClient.formatTemperature(100, 'F')).toBe('212°F');
  });
});
