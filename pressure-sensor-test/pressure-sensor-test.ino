#define PRESSURE_PIN 35

void setup() {
  Serial.begin(115200);
}

void loop() {
  Serial.println(analogRead(PRESSURE_PIN));
  delay(200);
}