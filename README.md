# Dyson MCP Server

An MCP (Model Context Protocol) server for controlling Dyson air purifiers and fans.

## Features

- **get_device_status** - Get current device state (power, fan speed, oscillation, night mode, air quality)
- **set_fan_speed** - Set fan speed (1-10 or auto)
- **set_oscillation** - Enable/disable oscillation
- **get_air_quality** - Get detailed air quality readings (PM2.5, PM10, VOC, NO2, humidity, temperature)
- **set_night_mode** - Enable/disable night mode

## Prerequisites

- Node.js 18+
- Dyson account with registered devices
- Dyson devices connected to your network

## Supported Devices

- Pure Cool Link (Tower & Desk)
- Pure Cool
- Pure Hot+Cool
- Pure Hot+Cool Link
- Pure Humidify+Cool
- Pure Cool Formaldehyde

## Installation

```bash
cd dyson-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

```bash
export DYSON_EMAIL=your-email@example.com
export DYSON_PASSWORD=your-password
export DYSON_COUNTRY=US  # Optional, defaults to US
```

### Supported Country Codes

- `US` - United States
- `GB` - United Kingdom
- `DE` - Germany
- `FR` - France
- `AU` - Australia
- `CN` - China

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dyson": {
      "command": "node",
      "args": ["/path/to/dyson-mcp/dist/index.js"],
      "env": {
        "DYSON_EMAIL": "your-email@example.com",
        "DYSON_PASSWORD": "your-password",
        "DYSON_COUNTRY": "US"
      }
    }
  }
}
```

## Usage Examples

### Get device status
```
get_device_status
```
Returns:
```json
{
  "device": {
    "serial": "ABC-XX-XXXXXXXX",
    "name": "Living Room"
  },
  "state": {
    "power": "on",
    "fanSpeed": "5",
    "oscillation": "on",
    "nightMode": "off",
    "autoMode": "off"
  },
  "airQuality": {
    "pm25": 8,
    "pm10": 12,
    "voc": 2,
    "no2": 1,
    "humidity": "45%",
    "temperature": "22.5°C",
    "level": "Good"
  }
}
```

### Set fan speed
```
set_fan_speed speed="5"
set_fan_speed speed="auto"
set_fan_speed device_id="ABC-XX-XXXXXXXX" speed="10"
```

### Set oscillation
```
set_oscillation enabled=true
set_oscillation device_id="ABC-XX-XXXXXXXX" enabled=false
```

### Get air quality
```
get_air_quality
```
Returns:
```json
{
  "pm25": {
    "value": 8,
    "unit": "µg/m³",
    "level": "Good"
  },
  "pm10": {
    "value": 12,
    "unit": "µg/m³"
  },
  "voc": {
    "value": 2,
    "unit": "index",
    "description": "Low"
  },
  "no2": {
    "value": 1,
    "unit": "index",
    "description": "Low"
  },
  "humidity": {
    "value": 45,
    "unit": "%",
    "description": "Comfortable"
  },
  "temperature": {
    "celsius": 22.5,
    "fahrenheit": 73
  }
}
```

### Set night mode
```
set_night_mode enabled=true
set_night_mode device_id="ABC-XX-XXXXXXXX" enabled=false
```

## Air Quality Index (AQI) Levels

Based on PM2.5 readings:

| PM2.5 (µg/m³) | Level |
|---------------|-------|
| 0-12 | Good |
| 13-35 | Moderate |
| 36-55 | Unhealthy for Sensitive Groups |
| 56-150 | Unhealthy |
| 151-250 | Very Unhealthy |
| 251+ | Hazardous |

## Development

```bash
# Watch mode
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Testing

```bash
npm test
```

## Troubleshooting

### Authentication Failed
- Verify your Dyson email and password are correct
- Ensure your account has registered devices
- Check if your country code is correct

### Device Not Found
- Ensure devices are powered on and connected to WiFi
- Check if devices appear in the Dyson Link app
- Try specifying the device serial number directly

### Air Quality Not Available
- Some older devices may not have air quality sensors
- Ensure the device supports air quality monitoring

## Security Notes

- Credentials are passed via environment variables (never hardcode)
- The server uses HTTPS for all API communication
- Consider using a secrets manager in production

## License

MIT
