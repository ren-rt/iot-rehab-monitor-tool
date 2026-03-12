#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- FILL IN WITH YOUR INFORMATION ---
const char* WIFI_SSID = "why";
const char* WIFI_PASSWORD = "eeek382829";

const char* FIREBASE_PROJECT_ID = "iot-rehab";
const char* FIREBASE_API_KEY = "AIzaSyC70UBYMxkXs-9pEIOVHWAB9NHw_aOmnCM";
// -----------------------------------------

// The name of the collection where data will be saved in Firestore
const char* COLLECTION_NAME = "sensor_readings";

void setup() {
  Serial.begin(115200);
  Serial.println("Starting...");

  // Connect to Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nSuccessfully connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Generate a random sensor value for the example
  int sensorValue = random(0, 1024);
  
  Serial.printf("Sending data to Firestore: sensorId = 1, value = %d\n", sensorValue);
  
  // Call the function that sends the data
  sendDataToFirestore(1, sensorValue);

  // Wait 30 seconds before sending the next data point
  delay(30000); 
}

void sendDataToFirestore(int sensorId, int value) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Error: Not connected to Wi-Fi.");
    return;
  }

  // Assemble the Firestore REST API URL.
  // By POSTing to the collection name, Firestore creates a random document ID.
  String url = "https://firestore.googleapis.com/v1/projects/" + String(FIREBASE_PROJECT_ID) +
               "/databases/(default)/documents/" + String(COLLECTION_NAME) +
               "?key=" + String(FIREBASE_API_KEY);

  // Create the request payload (body) in the JSON format required by Firestore.
  // This structure is the most critical part and a common source of errors.
  StaticJsonDocument<256> jsonDoc;
  
  JsonObject fields = jsonDoc.createNestedObject("fields");

  JsonObject sensorIdField = fields.createNestedObject("sensorId");
  sensorIdField["integerValue"] = sensorId;

  JsonObject valueField = fields.createNestedObject("value");
  valueField["integerValue"] = value;

  String jsonPayload;
  serializeJson(jsonDoc, jsonPayload);

  // Start the HTTP request
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  Serial.println("--- STARTING HTTP REQUEST ---");
  Serial.println("URL: " + url);
  Serial.println("Payload: " + jsonPayload);

  // Send the POST request with the JSON payload
  int httpResponseCode = http.POST(jsonPayload);

  // Check the server's response
  if (httpResponseCode > 0) {
    String responsePayload = http.getString();
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(responsePayload);
  } else {
    Serial.print("Error on POST request. Error code: ");
    Serial.println(httpResponseCode);
  }

  Serial.println("--- END OF HTTP REQUEST --- \n");

  // Free resources
  http.end();
}
