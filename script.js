// --- UPDATED CONFIGURATION FOR VERCEL ---
const MQTT_BROKER = "broker.emqx.io";
const MQTT_PORT = 8084; // Must be 8084 for HTTPS/SSL
const MQTT_TOPIC = "kent/cat/feed";
const CLIENT_ID = "web_user_" + Math.random().toString(16).substr(2, 8);

// --- UI ELEMENTS ---
const feedBtn = document.getElementById("feedBtn");
const durationRange = document.getElementById("durationRange");
const durationValue = document.getElementById("durationValue");
const elapsedTime = document.getElementById("elapsedTime");
const lastFeedLabel = document.getElementById("lastFeedLabel");
const historyList = document.getElementById("historyList");
const statusChip = document.getElementById("statusChip");

let lastFeedingTimestamp = null;

// --- MQTT CLIENT SETUP ---
const client = new Paho.MQTT.Client(MQTT_BROKER, MQTT_PORT, CLIENT_ID);

client.connect({
    onSuccess: () => {
        console.log("Connected to Cloud!");
        statusChip.textContent = "Status: Online (Global)";
    },
    onFailure: (err) => {
        console.error("Connection failed:", err.errorMessage);
        statusChip.textContent = "Status: Connection Failed";
    },
    useSSL: true, // MUST BE TRUE FOR VERCEL
    timeout: 3,
    keepAliveInterval: 30
});

// --- HELPER FUNCTIONS ---
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function renderElapsed() {
    if (!lastFeedingTimestamp) { elapsedTime.textContent = "00:00:00"; return; }
    const total = Math.floor((Date.now() - lastFeedingTimestamp) / 1000);
    const hours = String(Math.floor(total / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const seconds = String(total % 60).padStart(2, "0");
    elapsedTime.textContent = `${hours}:${minutes}:${seconds}`;
}

function addHistoryEntry(text) {
    if (historyList.children.length === 1 && historyList.children[0].textContent.includes("No feedings")) {
        historyList.innerHTML = "";
    }
    const li = document.createElement("li");
    li.textContent = text;
    li.classList.add("history-entry");
    historyList.prepend(li);
}

// --- INTERACTION ---
durationRange.addEventListener("input", () => {
    durationValue.textContent = durationRange.value;
});

feedBtn.addEventListener("click", () => {
    const dur = durationRange.value;
    
    if(!client.isConnected()) {
        alert("Not connected to cloud. Please refresh.");
        return;
    }

    // 1. Create the MQTT Message
    const message = new Paho.MQTT.Message("FEED");
    message.destinationName = MQTT_TOPIC;
    
    // 2. Send to Cloud
    try {
        client.send(message);
        console.log("Command sent: FEED");

        // UI Updates
        const now = new Date();
        lastFeedingTimestamp = now.getTime();
        lastFeedLabel.textContent = `Last fed at ${formatTime(now)}`;
        addHistoryEntry(`Fed at ${formatTime(now)} for ${dur}s`);
        statusChip.textContent = `Status: Command Sent!`;
        statusChip.classList.add("pulse");

        feedBtn.disabled = true;
        feedBtn.textContent = "Signal Sent!";

        setTimeout(() => {
            statusChip.textContent = "Status: Online (Global)";
            statusChip.classList.remove("pulse");
            feedBtn.disabled = false;
            feedBtn.innerHTML = '<span class="btn-dot"></span> Feed Pet Now';
        }, dur * 1000);

    } catch (e) {
        console.error("MQTT Error:", e);
        alert("Could not send signal. Check console for details.");
    }
});

setInterval(renderElapsed, 1000);