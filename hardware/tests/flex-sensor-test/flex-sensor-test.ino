const int flexPin = 34;

void setup() {
    Serial.begin(115200);
}

void loop() {
    int flexValue = analogRead(flexPin);
    Serial.print("Flex: ");
    Serial.println(flexValue);
    delay(20);
}