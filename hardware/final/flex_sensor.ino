#include <WiFi.h>  

// ─── Pin Definitions ─────────────────────────────────────────────
#define FLEX_PIN 12

// ─── ADC Config ────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(1000);

    // ADC resolution & attenuation
    analogReadResolution(12);
    analogSetPinAttenuation(FLEX_PIN, ADC_11db);

    Serial.println(" Flex Sensor Test Ready!");
}

void loop() {
    int flexValue = analogRead(FLEX_PIN);           // Read raw value
    float flexVoltage = flexValue * (3.3 / 4095.0); // Convert to voltage

    // Print to Serial
    Serial.print("Flex Raw: "); Serial.print(flexValue);
    Serial.print("  Voltage: "); Serial.println(flexVoltage, 3);

    delay(500); // delay for readability
}
