// กำหนด API URL - เปลี่ยนเป็น URL ของ Render เมื่อ deploy แล้ว
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://smarthomeproject-wr3t.onrender.com/api'; // เปลี่ยนตรงนี้

let currentRoom = 'all';

// Update time
function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    document.getElementById('timeDisplay').textContent = `${dateStr} | ${timeStr}`;
}

// Fetch sensor data
async function fetchSensorData() {
    try {
        const response = await fetch(`${API_URL}/sensors`);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        updateUI(data);
        updateConnectionStatus(true);
        
    } catch (error) {
        console.error('Error fetching data:', error);
        updateConnectionStatus(false);
    }
}

// Update UI with data
function updateUI(data) {
    // Determine which data to show
    let displayData;
    if (currentRoom === 'all') {
        displayData = {
            pm25: data.pm25,
            co2: data.co2,
            voc: data.voc,
            humidity: data.humidity,
            temp: data.temp
        };
    } else {
        displayData = data.rooms[currentRoom];
    }
    
    // Update sensor values
    document.getElementById('pm25').textContent = displayData.pm25;
    document.getElementById('co2').textContent = displayData.co2;
    document.getElementById('voc').textContent = displayData.voc;
    document.getElementById('humidity').textContent = displayData.humidity;
    document.getElementById('temp').textContent = displayData.temp;
    
    // Calculate and update AQI
    const aqi = calculateAQI(displayData);
    document.getElementById('aqiScore').textContent = aqi;
    
    // Update air quality status
    updateAirQualityStatus(displayData, aqi);
    
    // Update devices
    updateDeviceStatus(data.devices);
    
    // Update room label
    const roomLabels = {
        all: 'ALL ROOMS',
        livingRoom: 'LIVING ROOM',
        bedroom: 'BEDROOM',
        kitchen: 'KITCHEN'
    };
    document.getElementById('currentRoomLabel').textContent = roomLabels[currentRoom];
}

// Calculate AQI
function calculateAQI(data) {
    let score = 100;
    
    if (data.pm25 > 25) score -= 20;
    if (data.pm25 > 50) score -= 20;
    if (data.co2 > 1000) score -= 15;
    if (data.co2 > 2000) score -= 20;
    if (data.voc > 100) score -= 10;
    if (data.humidity > 70 || data.humidity < 30) score -= 10;
    
    return Math.max(0, score);
}

// Update air quality status
function updateAirQualityStatus(data, aqi) {
    const statusEl = document.getElementById('airStatus');
    const dot = statusEl.querySelector('.indicator-dot');
    const text = statusEl.querySelector('.indicator-text');
    
    if (aqi >= 80) {
        dot.className = 'indicator-dot good';
        text.textContent = 'EXCELLENT';
        text.style.color = 'var(--accent-green)';
        statusEl.style.background = 'rgba(0, 255, 136, 0.1)';
        statusEl.style.borderColor = 'var(--accent-green)';
    } else if (aqi >= 50) {
        dot.className = 'indicator-dot moderate';
        text.textContent = 'MODERATE';
        text.style.color = '#ffd700';
        statusEl.style.background = 'rgba(255, 215, 0, 0.1)';
        statusEl.style.borderColor = '#ffd700';
    } else {
        dot.className = 'indicator-dot poor';
        text.textContent = 'POOR';
        text.style.color = 'var(--accent-red)';
        statusEl.style.background = 'rgba(255, 0, 110, 0.1)';
        statusEl.style.borderColor = 'var(--accent-red)';
    }
}

// Update device status
function updateDeviceStatus(devices) {
    if (!devices) return;
    
    // Intake Fan
    const intakeFan = document.getElementById('intakeFan');
    const fanIndicator = intakeFan.querySelector('.power-indicator');
    if (devices.intakeFan.active) {
        intakeFan.classList.add('active');
        fanIndicator.classList.add('on');
        document.getElementById('fanSpeed').textContent = `${devices.intakeFan.speed}%`;
        document.getElementById('fanPower').textContent = 'ON';
    } else {
        intakeFan.classList.remove('active');
        fanIndicator.classList.remove('on');
        document.getElementById('fanSpeed').textContent = '0%';
        document.getElementById('fanPower').textContent = 'OFF';
    }
    
    // HEPA Filter
    const hepaFilter = document.getElementById('hepaFilter');
    const hepaIndicator = hepaFilter.querySelector('.power-indicator');
    if (devices.hepaFilter.active) {
        hepaFilter.classList.add('active');
        hepaIndicator.classList.add('on');
        document.getElementById('hepaStatus').textContent = 'ACTIVE';
        document.getElementById('hepaPower').textContent = 'ON';
    } else {
        hepaFilter.classList.remove('active');
        hepaIndicator.classList.remove('on');
        document.getElementById('hepaStatus').textContent = 'IDLE';
        document.getElementById('hepaPower').textContent = 'OFF';
    }
    
    // Air Purifier
    const airPurifier = document.getElementById('airPurifier');
    const purifierIndicator = airPurifier.querySelector('.power-indicator');
    if (devices.airPurifier.active) {
        airPurifier.classList.add('active');
        purifierIndicator.classList.add('on');
        document.getElementById('purifierPower').textContent = 'ON';
    } else {
        airPurifier.classList.remove('active');
        purifierIndicator.classList.remove('on');
        document.getElementById('purifierPower').textContent = 'OFF';
    }
    
    // Window Servo
    const windowServo = document.getElementById('windowServo');
    const windowIndicator = windowServo.querySelector('.power-indicator');
    if (devices.windowServo.active) {
        windowServo.classList.add('active');
        windowIndicator.classList.add('on');
        document.getElementById('windowPosition').textContent = 'OPEN';
        document.getElementById('windowPower').textContent = 'ON';
    } else {
        windowServo.classList.remove('active');
        windowIndicator.classList.remove('on');
        document.getElementById('windowPosition').textContent = 'CLOSED';
        document.getElementById('windowPower').textContent = 'OFF';
    }
}

// Add log
function addLog(message, type = 'info') {
    const terminal = document.getElementById('logTerminal');
    const logLine = document.createElement('div');
    logLine.className = 'log-line';
    
    const timestamp = new Date().toLocaleTimeString('en-US');
    const prefix = type === 'error' ? '[ERROR]' : type === 'warning' ? '[WARNING]' : '[INFO]';
    
    logLine.textContent = `${timestamp} ${prefix} ${message}`;
    
    if (type === 'error') logLine.style.borderLeftColor = 'var(--accent-red)';
    if (type === 'warning') logLine.style.borderLeftColor = '#ffd700';
    
    terminal.insertBefore(logLine, terminal.firstChild);
    
    while (terminal.children.length > 50) {
        terminal.removeChild(terminal.lastChild);
    }
}

// Update connection status
function updateConnectionStatus(isOnline) {
    const statusText = document.getElementById('connectionStatus');
    const statusDot = document.querySelector('.status-dot');
    
    if (isOnline) {
        statusText.textContent = 'SYSTEM ONLINE';
        statusDot.style.background = 'var(--accent-green)';
    } else {
        statusText.textContent = 'SYSTEM OFFLINE';
        statusDot.style.background = 'var(--accent-red)';
    }
}

// Room selector
document.querySelectorAll('.room-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentRoom = this.dataset.room;
        fetchSensorData();
        addLog(`Switched to ${this.textContent}`);
    });
});

// Initialize
updateTime();
setInterval(updateTime, 1000);
fetchSensorData();
setInterval(fetchSensorData, 2000);

// Check connection
setInterval(async () => {
    try {
        await fetch(`${API_URL}/status`);
        updateConnectionStatus(true);
    } catch {
        updateConnectionStatus(false);
    }
}, 5000);

