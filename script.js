// --- UPDATED CONFIGURATION FOR VERCEL ---
const MQTT_BROKER = "broker.emqx.io";
const MQTT_PORT = 8084; // Must be 8084 for HTTPS/SSL
const MQTT_TOPIC = "kent/cat/feed";
const CLIENT_ID = "web_user_" + Math.random().toString(16).substr(2, 8);
const AUTH_KEY = "pfd_auth";
const LOGIN_USERNAME = "admin";
const LOGIN_PASSWORD = "pfd123";

// --- UI ELEMENTS ---
const feedBtn = document.getElementById("feedBtn");
const durationRange = document.getElementById("durationRange");
const durationValue = document.getElementById("durationValue");
const elapsedTime = document.getElementById("elapsedTime");
const lastFeedLabel = document.getElementById("lastFeedLabel");
const historyList = document.getElementById("historyList");
const statusChip = document.getElementById("statusChip");
const loginOverlay = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const motionItems = document.querySelectorAll(".motion-item");
const cards = document.querySelectorAll(".card");

let lastFeedingTimestamp = null;
let isAuthenticated = localStorage.getItem(AUTH_KEY) === "true";

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

function applyAuthUI() {
    if (isAuthenticated) {
        loginOverlay.classList.add("hidden");
        feedBtn.disabled = false;
        runEntranceAnimation();
    } else {
        loginOverlay.classList.remove("hidden");
        feedBtn.disabled = true;
    }
}

function runEntranceAnimation() {
    motionItems.forEach((item, index) => {
        item.style.animation = "none";
        item.offsetHeight;
        item.style.animation = `fadeUpIn 0.75s cubic-bezier(0.22, 1, 0.36, 1) ${0.08 * index}s forwards`;
    });
}

function setupCardMotion() {
    cards.forEach((card) => {
        card.addEventListener("mousemove", (event) => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateY = ((x - centerX) / centerX) * 3.2;
            const rotateX = ((centerY - y) / centerY) * 2.6;
            card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "";
        });
    });
}

// --- INTERACTION ---
durationRange.addEventListener("input", () => {
    durationValue.textContent = durationRange.value;
});

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
        isAuthenticated = true;
        localStorage.setItem(AUTH_KEY, "true");
        loginError.textContent = "";
        usernameInput.value = "";
        passwordInput.value = "";
        applyAuthUI();
        return;
    }

    loginError.textContent = "Invalid username or password.";
});

logoutBtn.addEventListener("click", () => {
    isAuthenticated = false;
    localStorage.removeItem(AUTH_KEY);
    statusChip.textContent = "Status: Login required";
    applyAuthUI();
});

feedBtn.addEventListener("click", () => {
    if (!isAuthenticated) {
        alert("Please login first.");
        applyAuthUI();
        return;
    }

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

applyAuthUI();
setupCardMotion();
setInterval(renderElapsed, 1000);