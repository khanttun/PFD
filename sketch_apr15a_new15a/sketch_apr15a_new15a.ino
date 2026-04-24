#include <WiFi.h>
#include <PubSubClient.h> 
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- WIFI CONFIGURATION ---
const char* ssid = "kent";           // Your WiFi Name
const char* password = "12345678";   // Your WiFi Password

// --- MQTT CONFIGURATION ---
const char* mqtt_server = "broker.emqx.io"; 
const char* topic = "kent/cat/feed"; // MUST MATCH SCRIPT.JS

WiFiClient espClient;
PubSubClient client(espClient);
Servo myServo;
LiquidCrystal_I2C display(0x27, 16, 2);

// --- PINS ---
const int servoPin = 18;
bool isFeeding = false;
unsigned long feedStartTime = 0;
int feedDuration = 5; // Default seconds

void updateLCD(String line1, String line2) {
  display.clear();
  display.setCursor(0, 0);
  display.print(line1);
  display.setCursor(0, 1);
  display.print(line2);
}

// --- THIS RUNS WHEN THE WEBSITE SENDS A SIGNAL ---
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println("Cloud Signal Received: " + message);

  if (message == "FEED" && !isFeeding) {
    isFeeding = true;
    feedStartTime = millis();
    
    myServo.attach(servoPin);
    myServo.write(180); // Open
    
    updateLCD("CLOUD SIGNAL:", "FEEDING...");
    Serial.println("Dispensing Food...");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT Cloud...");
    String clientId = "ESP32-CatFeeder-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(topic); // Start listening to the topic
      updateLCD("Cloud Status:", "CONNECTED");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5s");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  display.init();
  display.backlight();
  updateLCD("Connecting...", "WiFi");

  myServo.attach(servoPin);
  myServo.write(0); // Close
  delay(500);
  myServo.detach();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop(); 

  // Logic to close dispenser after duration
  if (isFeeding && (millis() - feedStartTime >= (unsigned long)feedDuration * 1000)) {
    myServo.write(0); // Close
    delay(500);
    myServo.detach();
    isFeeding = false;
    updateLCD("Fed!", "Waiting...");
  }
}