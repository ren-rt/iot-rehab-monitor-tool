#include <Wire.h>
#include <MPU6050.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ─── WiFi ─────────────────────────────────────────────────────────────────────
#define WIFI_SSID        "why"
#define WIFI_PASSWORD    "eeek382829"

// ─── Pin Definitions ──────────────────────────────────────────────────────────
#define FSR_PIN   14
#define FLEX_PIN  12
#define EMG_PIN 17

// ─── I2C Buses ────────────────────────────────────────────────────────────────
// IMU1 → Wire  (SDA=8, SCL=9)  — upper arm
// IMU2 → Wire2 (SDA=4, SCL=5)  — forearm
TwoWire Wire2 = TwoWire(1);
MPU6050 mpu1;
MPU6050 mpu2;

// ─── Firebase ─────────────────────────────────────────────────────────────────
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ─── Timing ───────────────────────────────────────────────────────────────────
unsigned long sendDataPrevMillis = 0;
#define SEND_INTERVAL 500

// ─── IMU1 Hang Detection ──────────────────────────────────────────────────────
static int16_t last_ax1 = 0;
static int16_t last_ay1 = 0;
static int hangCount = 0;

// ─── Calibration Offsets ──────────────────────────────────────────────────────
int16_t cal_ax1, cal_ay1, cal_az1;
int16_t cal_ax2, cal_ay2, cal_az2;

// ─── IMU1 Reset ───────────────────────────────────────────────────────────────
void resetIMU1() {
    Wire.end();
    delay(100);
    Wire.begin(15, 16);
    mpu1 = MPU6050(0x69, &Wire);
    mpu1.initialize();
    Serial.println("🔄 IMU1 reset!");
}

// ─── Setup ────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(1000);

    // ADC config
    analogReadResolution(12);
    analogSetPinAttenuation(FSR_PIN,  ADC_11db);
    analogSetPinAttenuation(FLEX_PIN, ADC_11db);
    analogSetPinAttenuation(EMG_PIN, ADC_11db);

    // I2C + IMU
    Wire.begin(15, 16);
    Wire2.begin(4, 5);
    mpu1 = MPU6050(0x69, &Wire);
    mpu1.initialize();
    mpu2 = MPU6050(0x68, &Wire2);
    mpu2.initialize();

    Serial.println(mpu1.testConnection() ? "✅ IMU1 connected!" : "❌ IMU1 failed");
    Serial.println(mpu2.testConnection() ? "✅ IMU2 connected!" : "❌ IMU2 failed");

    // WiFi
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to Wi-Fi");
    while (WiFi.status() != WL_CONNECTED) {
        Serial.print(".");
        delay(300);
    }
    Serial.println();
    Serial.print("Connected with IP: ");
    Serial.println(WiFi.localIP());

    // Firebase
    config.api_key       = "AIzaSyD9dHdERJ8NnDJerfadQjcP2_nXhIqrEsE";
    config.database_url  = "https://testfirebaseapp-729a4-default-rtdb.asia-southeast1.firebasedatabase.app";
    auth.user.email      = "test123@gmail.com";
    auth.user.password   = "testing";

    Firebase.reconnectNetwork(true);
    fbdo.setResponseSize(1024);
    fbdo.setBSSLBufferSize(2048, 512);
    Firebase.begin(&config, &auth);
    Firebase.setDoubleDigits(5);
    config.timeout.serverResponse = 10 * 1000;

    Serial.println("========================================");
    Serial.println("   RehabMate Sensor → Firebase Ready");
    Serial.println("========================================");

    
    
    
}

// ─── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
    
    if (Firebase.ready() && (millis() - sendDataPrevMillis > SEND_INTERVAL || sendDataPrevMillis == 0)) {
        sendDataPrevMillis = millis();

        // ── Read IMUs ──────────────────────────────────────────────────────
        int16_t ax1, ay1, az1, gx1, gy1, gz1;
        int16_t ax2, ay2, az2, gx2, gy2, gz2;
        mpu1.getMotion6(&ax1, &ay1, &az1, &gx1, &gy1, &gz1);
        delay(50);
        mpu2.getMotion6(&ax2, &ay2, &az2, &gx2, &gy2, &gz2);

        // ── IMU1 hang detection ────────────────────────────────────────────
        if (ax1 == last_ax1 && ay1 == last_ay1) {
            hangCount++;
            if (hangCount > 0) {
                resetIMU1();
                hangCount = 0;
            }
        } else {
            hangCount = 0;
        }
        last_ax1 = ax1;
        last_ay1 = ay1;        

        // ── Apply calibration offsets ──────────────────────────────────────
        ax1 -= cal_ax1; ay1 -= cal_ay1; az1 -= cal_az1;
        ax2 -= cal_ax2; ay2 -= cal_ay2; az2 -= cal_az2;

        // ── Read analog sensors ────────────────────────────────────────────
        int   fsrValue  = analogRead(FSR_PIN);
        int   flexValue = analogRead(FLEX_PIN);
        int emgValue  = analogRead(EMG_PIN);
        float voltage   = fsrValue * (3.3 / 4095.0);
        float emgVoltage = emgValue * (3.3 / 4095.0);


        // ── Serial debug ───────────────────────────────────────────────────
        Serial.println("--- IMU 1 (calibrated) ---");
        Serial.print("Accel: "); Serial.print(ax1); Serial.print(", "); Serial.print(ay1); Serial.print(", "); Serial.println(az1);
        Serial.print("Gyro:  "); Serial.print(gx1); Serial.print(", "); Serial.print(gy1); Serial.print(", "); Serial.println(gz1);

        Serial.println("--- IMU 2 (calibrated) ---");
        Serial.print("Accel: "); Serial.print(ax2); Serial.print(", "); Serial.print(ay2); Serial.print(", "); Serial.println(az2);
        Serial.print("Gyro:  "); Serial.print(gx2); Serial.print(", "); Serial.print(gy2); Serial.print(", "); Serial.println(gz2);

        Serial.println("--- FSR & Flex ---");
        Serial.print("FSR: "); Serial.print(fsrValue);
        Serial.print("  Flex: "); Serial.print(flexValue);
        Serial.print("  Voltage: "); Serial.println(voltage, 3);
        Serial.print("  EMG: "); Serial.print(emgValue);
        Serial.print("  EMG V: "); Serial.println(emgVoltage, 3);

        // ── Upload IMU 1 ───────────────────────────────────────────────────
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu1/ax", ax1);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu1/ay", ay1);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu1/az", az1);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu1/gx", gx1);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu1/gy", gy1);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu1/gz", gz1);

        // ── Upload IMU 2 ───────────────────────────────────────────────────
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu2/ax", ax2);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu2/ay", ay2);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu2/az", az2);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu2/gx", gx2);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu2/gy", gy2);
        Firebase.RTDB.setInt(&fbdo, "/sensors/imu2/gz", gz2);

        // ── Upload FSR & Flex ──────────────────────────────────────────────
        Firebase.RTDB.setInt(&fbdo, "/sensors/fsr/raw", fsrValue);
        Firebase.RTDB.setInt(&fbdo, "/sensors/flex/raw", flexValue);
        Firebase.RTDB.setFloat(&fbdo, "/sensors/fsr/voltage", voltage);

        const char* label;
        if      (fsrValue < 50)   label = "none";
        else if (fsrValue < 500)  label = "light_touch";
        else if (fsrValue < 1500) label = "light";
        else if (fsrValue < 3000) label = "medium";
        else                      label = "heavy";
        Firebase.RTDB.setString(&fbdo, "/sensors/fsr/label", label);

        // Upload EMG
        Firebase.RTDB.setInt(&fbdo, "/sensors/emg/raw", emgValue);
        Firebase.RTDB.setFloat(&fbdo, "/sensors/emg/voltage", emgVoltage);

        Serial.println("----------------------------------------");
    }
}
