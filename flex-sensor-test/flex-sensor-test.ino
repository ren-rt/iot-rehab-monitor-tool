#define FLEX_PIN 34

void setup() {
  Serial.begin(115200);
}

void loop() {
  Serial.println(analogRead(FLEX_PIN));
  delay(200);
}