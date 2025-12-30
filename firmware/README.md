# AUREOLE Perfume Dispenser - ESP32 Firmware

This folder contains the firmware for the ESP32 microcontroller that powers the perfume dispensing machine.

## Hardware Requirements

- **ESP32 Development Board** (e.g., ESP32 DevKit V1)
- **Buzzer** (Active or Passive) connected to **GPIO 5**
- **Pump Relay/Transistor** connected to **GPIO 2**
- **Status LED** connected to **GPIO 4** (Optional)

## Setup Instructions

1.  **Install Arduino IDE**: Download and install from [arduino.cc](https://www.arduino.cc/en/software).
2.  **Install ESP32 Board Support**:
    - Open Arduino IDE -> File -> Preferences.
    - Add `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json` to "Additional Board Manager URLs".
    - Go to Tools -> Board -> Boards Manager, search for "esp32", and install "esp32 by Espressif Systems".
3.  **Install Libraries**:
    - Go to Tools -> Manage Libraries.
    - Search for and install **ArduinoJson** (by Benoit Blanchon).

## Configuration

Open `esp32_main.ino` and update the following lines at the top:

1.  **WiFi Credentials**:
    ```cpp
    const char* ssid = "YOUR_WIFI_SSID";         // Your WiFi Name
    const char* password = "YOUR_WIFI_PASSWORD"; // Your WiFi Password
    ```

2.  **API URL**:
    - You need the URL where your backend is running.
    - If testing locally, run `START_EVERYTHING.bat` and copy the **Tunnel URL** (e.g., `https://funny-name.loca.lt`).
    - **IMPORTANT**: Append `/api` to the URL.
    ```cpp
    const char* apiBaseUrl = "https://your-tunnel-url.loca.lt/api";
    ```

## Uploading

1.  Connect your ESP32 to your computer via USB.
2.  Select your board in Arduino IDE: Tools -> Board -> ESP32 Dev Module.
3.  Select the correct Port: Tools -> Port.
4.  Click the **Upload** button (Right Arrow icon).

## How it Works

1.  The ESP32 connects to your WiFi.
2.  It polls the backend (`/api/trigger-dispense`) every 3 seconds to check for new orders.
3.  When an order is received:
    - It beeps the buzzer **N times** corresponding to the **Perfume ID** (1-12).
    - It activates the pump for the specified duration.
    - It sends a confirmation back to the server.
