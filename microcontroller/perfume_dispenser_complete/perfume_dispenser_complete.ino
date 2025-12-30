/**
 * AUREOLE - Perfume Dispensing Machine Firmware v1.2 (Restored)
 * Target: ESP32 Dev Module
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ==================== CONFIGURATION ====================

// WiFi Credentials
const char* ssid     = "ACT Extension";
const char* password = "pruthvi007";

// API Configuration (Stable Tunnel URL)
const char* apiBaseUrl = "https://aureole-dispenser.loca.lt/api";

// Hardware Pins (Restored for v1.2)
const int PUMP_PIN   = 27;
const int BUZZER_PIN = 5;
const int LED_PIN    = 14;
const int INBUILT_LED = 2; // Built-in blue LED on ESP32

// Timings
const int DEFAULT_PUMP_DURATION_MS = 2000;
const unsigned long POLL_INTERVAL_MS = 3000;

// ==================== GLOBALS ====================

unsigned long lastPollTime = 0;
unsigned long lastWiFiRetry = 0;
bool isDispensing = false;

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n╔═══════════════════════════════════════╗");
  Serial.println("║      AUREOLE PERFUME DISPENSER        ║");
  Serial.println("║           Firmware v1.2               ║");
  Serial.println("╚═══════════════════════════════════════╝");

  pinMode(PUMP_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(INBUILT_LED, OUTPUT);

  digitalWrite(PUMP_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(INBUILT_LED, LOW);

  WiFi.mode(WIFI_STA);
  connectToWiFi();

  // Boot beep
  tone(BUZZER_PIN, 1500, 150);
  delay(150);
  noTone(BUZZER_PIN);
}

// ==================== LOOP ====================

void loop() {
  // WiFi reconnect every 30 seconds if lost
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiRetry > 30000) {
      lastWiFiRetry = millis();
      Serial.println("⚠️ WiFi lost. Retrying...");
      WiFi.disconnect();
      WiFi.begin(ssid, password);
    }
    delay(50);
    return;
  }

  unsigned long now = millis();

  if ((now - lastPollTime >= POLL_INTERVAL_MS) && !isDispensing) {
    lastPollTime = now;
    checkForPendingOrders();
  }

  delay(50);
}

// ==================== WIFI ====================

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
    Serial.print(".");
    yield();
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi Failed (will retry later)");
  }
}

// ==================== API ====================

void checkForPendingOrders() {
  HTTPClient http;
  WiFiClientSecure client; // Use secure client for HTTPS tunnel
  client.setInsecure();    // Bypassing cert validation for localtunnel

  String url = String(apiBaseUrl) + "/trigger-dispense";

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Bypass-Tunnel-Reminder", "true");

  int code = http.POST("{}");

  if (code == 200) {
    String response = http.getString();

    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (!error && doc["success"] && doc["hasOrder"]) {
      String orderId = doc["data"]["orderId"].as<String>();
      int perfumeId  = doc["data"]["perfumeId"] | 1;
      int sprays     = doc["data"]["sprays"] | 1;

      Serial.println("\n📦 NEW ORDER");
      Serial.println("Order ID: " + orderId);
      Serial.println("Perfume ID: " + String(perfumeId));
      Serial.println("Sprays: " + String(sprays));

      isDispensing = true;
      executeDispense(perfumeId, sprays);
      confirmDispense(orderId);
      isDispensing = false;
    }
  } else if (code > 0) {
    // Silence common poll logs to keep serial clean
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(code);
  }

  http.end();
}

void confirmDispense(String orderId) {
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure();

  String url = String(apiBaseUrl) + "/confirm-dispense";

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["orderId"] = orderId;
  doc["status"] = "success";
  doc["message"] = "Dispensed successfully";

  String payload;
  serializeJson(doc, payload);

  http.POST(payload);
  http.end();

  Serial.println("✅ Dispense confirmed");
}

// ==================== DISPENSING ====================

void executeDispense(int perfumeId, int sprays) {
  Serial.println("🚀 DISPENSING");

  // Buzzer announce perfume ID
  for (int i = 0; i < perfumeId; i++) {
    tone(BUZZER_PIN, 2500, 150);
    delay(150);
    noTone(BUZZER_PIN);
    delay(200);
    yield();
  }

  digitalWrite(LED_PIN, HIGH);
  digitalWrite(INBUILT_LED, HIGH);

  for (int i = 0; i < sprays; i++) {
    Serial.print("💨 Spray ");
    Serial.println(i + 1);

    digitalWrite(PUMP_PIN, HIGH);
    delay(DEFAULT_PUMP_DURATION_MS);
    digitalWrite(PUMP_PIN, LOW);

    delay(1500);
    yield();
  }

  digitalWrite(LED_PIN, LOW);
  digitalWrite(INBUILT_LED, LOW);

  // Completion sound
  tone(BUZZER_PIN, 1000, 100);
  delay(100);
  tone(BUZZER_PIN, 1500, 100);
  delay(100);
  tone(BUZZER_PIN, 2000, 200);
  delay(200);
  noTone(BUZZER_PIN);

  Serial.println("✅ DISPENSE COMPLETE");
}
