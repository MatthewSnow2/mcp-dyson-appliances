#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DysonClient } from './dyson-client.js';

// Get configuration from environment
const DYSON_EMAIL = process.env.DYSON_EMAIL;
const DYSON_PASSWORD = process.env.DYSON_PASSWORD;
const DYSON_COUNTRY = process.env.DYSON_COUNTRY || 'US';

if (!DYSON_EMAIL || !DYSON_PASSWORD) {
  console.error('Error: DYSON_EMAIL and DYSON_PASSWORD environment variables are required');
  console.error('Set them in your MCP configuration or .env file');
  process.exit(1);
}

const dysonClient = new DysonClient(DYSON_EMAIL, DYSON_PASSWORD, DYSON_COUNTRY);

// Create MCP server
const server = new Server(
  {
    name: 'dyson-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_device_status',
        description: 'Get current status of a Dyson device including power state, fan speed, oscillation, night mode, and air quality',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device serial number (optional, defaults to first device)',
            },
          },
          required: [],
        },
      },
      {
        name: 'set_fan_speed',
        description: 'Set the fan speed of a Dyson device. Speed can be 1-10 or "auto"',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device serial number (optional, defaults to first device)',
            },
            speed: {
              type: 'string',
              description: 'Fan speed: 1-10 or "auto"',
            },
          },
          required: ['speed'],
        },
      },
      {
        name: 'set_oscillation',
        description: 'Enable or disable oscillation on a Dyson device',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device serial number (optional, defaults to first device)',
            },
            enabled: {
              type: 'boolean',
              description: 'true to enable oscillation, false to disable',
            },
          },
          required: ['enabled'],
        },
      },
      {
        name: 'get_air_quality',
        description: 'Get current air quality readings from a Dyson device including PM2.5, PM10, VOC, NO2, humidity, and temperature',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device serial number (optional, defaults to first device)',
            },
          },
          required: [],
        },
      },
      {
        name: 'set_night_mode',
        description: 'Enable or disable night mode on a Dyson device. Night mode reduces noise and dims the display',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'Device serial number (optional, defaults to first device)',
            },
            enabled: {
              type: 'boolean',
              description: 'true to enable night mode, false to disable',
            },
          },
          required: ['enabled'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_device_status': {
        const deviceId = args?.device_id as string | undefined;
        const status = await dysonClient.getDeviceStatus(deviceId);

        const formatted = {
          device: {
            serial: status.serial,
            name: status.name,
          },
          state: {
            power: status.power ? 'on' : 'off',
            fanSpeed: status.fanSpeed,
            oscillation: status.oscillation ? 'on' : 'off',
            nightMode: status.nightMode ? 'on' : 'off',
            autoMode: status.autoMode ? 'on' : 'off',
          },
          airQuality: status.airQuality
            ? {
                pm25: status.airQuality.pm25,
                pm10: status.airQuality.pm10,
                voc: status.airQuality.voc,
                no2: status.airQuality.no2,
                humidity: `${status.airQuality.humidity}%`,
                temperature: DysonClient.formatTemperature(status.airQuality.temperature),
                level: DysonClient.getAirQualityLevel(status.airQuality.pm25),
              }
            : null,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      }

      case 'set_fan_speed': {
        const deviceId = args?.device_id as string | undefined;
        const speed = args?.speed as string;

        if (!speed) {
          throw new Error('Speed is required. Use 1-10 or "auto"');
        }

        const status = await dysonClient.setFanSpeed(deviceId, speed);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `Fan speed set to ${status.fanSpeed}`,
                  device: status.name,
                  newState: {
                    power: status.power ? 'on' : 'off',
                    fanSpeed: status.fanSpeed,
                    autoMode: status.autoMode ? 'on' : 'off',
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'set_oscillation': {
        const deviceId = args?.device_id as string | undefined;
        const enabled = args?.enabled as boolean;

        if (enabled === undefined) {
          throw new Error('Enabled parameter is required (true/false)');
        }

        const status = await dysonClient.setOscillation(deviceId, enabled);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `Oscillation ${enabled ? 'enabled' : 'disabled'}`,
                  device: status.name,
                  oscillation: status.oscillation ? 'on' : 'off',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_air_quality': {
        const deviceId = args?.device_id as string | undefined;
        const airQuality = await dysonClient.getAirQuality(deviceId);

        const formatted = {
          pm25: {
            value: airQuality.pm25,
            unit: 'µg/m³',
            level: DysonClient.getAirQualityLevel(airQuality.pm25),
          },
          pm10: {
            value: airQuality.pm10,
            unit: 'µg/m³',
          },
          voc: {
            value: airQuality.voc,
            unit: 'index',
            description: airQuality.voc < 3 ? 'Low' : airQuality.voc < 6 ? 'Moderate' : 'High',
          },
          no2: {
            value: airQuality.no2,
            unit: 'index',
            description: airQuality.no2 < 3 ? 'Low' : airQuality.no2 < 6 ? 'Moderate' : 'High',
          },
          humidity: {
            value: airQuality.humidity,
            unit: '%',
            description:
              airQuality.humidity < 30
                ? 'Too dry'
                : airQuality.humidity > 60
                  ? 'Too humid'
                  : 'Comfortable',
          },
          temperature: {
            celsius: airQuality.temperature,
            fahrenheit: Math.round(airQuality.temperature * 9 / 5 + 32),
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatted, null, 2),
            },
          ],
        };
      }

      case 'set_night_mode': {
        const deviceId = args?.device_id as string | undefined;
        const enabled = args?.enabled as boolean;

        if (enabled === undefined) {
          throw new Error('Enabled parameter is required (true/false)');
        }

        const status = await dysonClient.setNightMode(deviceId, enabled);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `Night mode ${enabled ? 'enabled' : 'disabled'}`,
                  device: status.name,
                  nightMode: status.nightMode ? 'on' : 'off',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Dyson MCP server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
