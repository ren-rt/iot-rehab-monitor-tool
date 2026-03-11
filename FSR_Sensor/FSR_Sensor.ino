// Pin Definition 
#define FSR_PIN 14

void setup() {
  Serial.begin(115200);

  // Configure ADC
  analogReadResolution(12);
  analogSetPinAttenuation(FSR_PIN, ADC_11db);

  Serial.println("FSR Sensor Test Started");
}

void loop() {

  // Read FSR value
  int fsrValue = analogRead(FSR_PIN);

  // Convert to voltage
  float voltage = fsrValue * (3.3 / 4095.0);

  // Pressure level 
  const char* label;
  if      (fsrValue < 50)   label = "none";
  else if (fsrValue < 500)  label = "light_touch";
  else if (fsrValue < 1500) label = "light";
  else if (fsrValue < 3000) label = "medium";
  else                      label = "heavy";

  // Serial output
  Serial.print("Raw Value: ");
  Serial.print(fsrValue);

  Serial.print("  Voltage: ");
  Serial.print(voltage, 3);

  Serial.print("  Pressure: ");
  Serial.println(label);

  Serial.println("--------------------------");

  delay(500);
}
