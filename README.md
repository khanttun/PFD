# 🐾 PawFeeder — Smart Pet Food Dispenser

A cloud-connected automatic pet food dispenser built with an **ESP32** microcontroller and a **web dashboard** deployable to Vercel. Feed your pet from anywhere in the world using MQTT over the internet.

> Made by **Pawnleads** · © 2026 The Smart Food Dispenser

---

## How It Works

```
Web Dashboard (Vercel)
       │
       │  publishes "FEED" via MQTT over SSL (port 8084)
       ▼
 MQTT Broker (broker.emqx.io)
       │
       │  delivers message
       ▼
  ESP32 (subscribed on port 1883)
       │
       │  servo opens → waits 5 seconds → servo closes
       ▼
  LCD shows "CLOUD SIGNAL: FEEDING..."
```

The web dashboard connects to the MQTT broker via **WebSocket over SSL** (browser-safe). The ESP32 connects via standard **TCP MQTT**. Both sides subscribe/publish to the same topic (`kent/cat/feed`), so a button press on the website instantly triggers the hardware anywhere in the world.

---

## Features

- **Global control** — feed your pet from any device, anywhere, via the internet
- **Secure login** — password-protected dashboard (username + password required before feeding)
- **MQTT cloud messaging** — uses EMQX public broker; no port-forwarding or static IP needed
- **Animated dashboard** — card hover effects, entrance animations, live elapsed-time counter
- **Feeding history** — timestamped log of every feed event in the current session
- **16×2 LCD display** — shows Wi-Fi/MQTT status and feeding state on the hardware
- **Auto-reconnect** — ESP32 automatically reconnects to MQTT if the connection drops
- **Busy-lock** — ignores duplicate feed commands while a dispensing cycle is active
- **Responsive UI** — works on desktop and mobile browsers
- **Deployable to Vercel** — static frontend, no backend server required

---

## Repository Structure

```
PFD/
├── index.html                        # Web dashboard UI
├── style.css                         # Styles & animations
├── script.js                         # MQTT client logic & auth
└── sketch_apr15a_new15a/
    └── sketch_apr15a_new15a.ino      # ESP32 firmware
```

---

## Hardware Requirements

| Component | Details |
|---|---|
| ESP32 development board | Any standard ESP32 devkit |
| Servo motor | Standard 5V servo (signal → GPIO 18) |
| 16×2 I²C LCD | Address `0x27` · SDA → GPIO 21 · SCL → GPIO 22 |
| Power supply | 5V for servo · USB or regulated 5V for ESP32 |
| Food dispenser mechanism | Servo-actuated gate or auger |

---

## Arduino Libraries

Install all of these via the **Arduino Library Manager**:

| Library | Purpose |
|---|---|
| `WiFi` (built-in) | Wi-Fi connection |
| `PubSubClient` by Nick O'Leary | MQTT client |
| `ESP32Servo` | Servo control |
| `LiquidCrystal_I2C` | LCD display |
| `Wire` (built-in) | I²C communication |

**Board:** ESP32 Dev Module (or equivalent)

---

## Part 1 — ESP32 Firmware Setup

### 1. Configure credentials

Open `sketch_apr15a_new15a/sketch_apr15a_new15a.ino` and update the top of the file:

```cpp
// Wi-Fi
const char* ssid     = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT — must match script.js
const char* mqtt_server = "broker.emqx.io";
const char* topic       = "kent/cat/feed";
```

> ⚠️ The `topic` value must be **identical** in both the firmware and `script.js`.

### 2. Wire the hardware

| GPIO | Connected to |
|---|---|
| 18 | Servo signal wire (yellow/orange) |
| 21 | LCD SDA |
| 22 | LCD SCL |

### 3. Upload

Select `Tools → Board → ESP32 Dev Module` in Arduino IDE, then upload the sketch.

### 4. Verify connection

Open the Serial Monitor at **115200 baud**. You should see:

```
.....
Connecting to MQTT Cloud...connected
```

The LCD will display:
```
Cloud Status:
CONNECTED
```

---

## Part 2 — Web Dashboard Setup

The dashboard is a fully static site (HTML + CSS + JS) — no server needed.

### Run locally

Just open `index.html` in any browser. Because it connects to the MQTT broker over SSL WebSocket, it works from `file://` or any web host.

### Deploy to Vercel

1. Push the repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.
3. Leave all settings as default (it's a static site).
4. Click **Deploy**.

Your dashboard will be live at a public URL in under a minute.

### Default login credentials

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `pfd123` |

> To change these, edit the constants in `script.js`:
> ```js
> const LOGIN_USERNAME = "admin";
> const LOGIN_PASSWORD = "pfd123";
> ```

---

## Usage

1. Open the dashboard (locally or on Vercel).
2. Log in with the credentials above.
3. Adjust the **dispenser open duration** slider (1–30 seconds).
4. Press **Feed Pet Now** — the button sends a `FEED` message to the MQTT broker, which delivers it to the ESP32 instantly.
5. The ESP32 opens the servo to **180°**, waits for the set duration, then closes it back to **0°**.
6. The LCD shows `CLOUD SIGNAL: FEEDING...` while dispensing, then `Fed! Waiting...` when done.

---

## MQTT Reference

| Setting | Value |
|---|---|
| Broker | `broker.emqx.io` |
| ESP32 port | `1883` (TCP) |
| Browser port | `8084` (WebSocket SSL) |
| Topic | `kent/cat/feed` |
| Trigger payload | `FEED` |

To test from the command line (requires [Mosquitto](https://mosquitto.org)):
```bash
mosquitto_pub -h broker.emqx.io -t "kent/cat/feed" -m "FEED"
```

---

## Servo Angle Reference

| State | Angle |
|---|---|
| Closed / home | 0° |
| Open / dispensing | 180° |

To adjust for your physical mechanism, change the values in the `callback()` function and the `loop()` closing logic in the firmware.

---

## Customization

| What | Where | How |
|---|---|---|
| Feed duration | `sketch_apr15a_new15a.ino` | Change `int feedDuration = 5;` |
| MQTT topic | Both `script.js` and `.ino` | Must match in both files |
| Login credentials | `script.js` | Change `LOGIN_USERNAME` / `LOGIN_PASSWORD` |
| LCD I²C address | `.ino` | Change `0x27` to `0x3F` if your module differs |
| Servo pin | `.ino` | Change `const int servoPin = 18;` |
| MQTT broker | Both files | Replace `broker.emqx.io` with your private broker |

---

## Security Notes

- Login credentials are stored in `script.js` (client-side). This is suitable for personal/home use but **not for public deployments** without a proper backend auth system.
- The EMQX public broker is shared — anyone who knows your topic can publish to it. For private use, change the topic to something unique or use a private broker.
- Auth state is persisted in `localStorage` so you stay logged in between page refreshes.

---

## License

This project is open source. Feel free to use, modify, and build upon it.
