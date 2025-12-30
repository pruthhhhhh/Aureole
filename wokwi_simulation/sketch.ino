// Wokwi Sketch for Perfume Dispenser Simulation
#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  pinMode(18, OUTPUT); // Buzzer
  pinMode(19, OUTPUT); // Pump/LED
  Serial.println("Hello, Perfume Dispenser!");
}

void loop() {
  delay(10);
}
