const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://your-app-name.onrender.com/api'; // เปลี่ยนตรงนี้

let currentData = {
    pm25: 12,
    co2: 450,
    voc: 20,
    humidity: 55,
    temp: 28,
    rooms: {
        livingRoom: { pm25: 12, co2: 450, voc: 20, humidity: 55, temp: 28 },
        bedroom: { pm25: 10, co2: 400, voc: 15, humidity: 52, temp: 26 },
        kitchen: { pm25: 18, co2: 600, voc: 35, humidity: 60, temp: 29 }
    },
    currentRoom: 'all',
    devices: {
        intakeFan: { active: false, speed: 0 },
        hepaFilter: { active: false },
        airPurifier: { active: false },
        windowServo: { active: false }
    },
    rules: {
        pm25: true,
        co2: true,
        voc: true,
        humidity: true
    }
};

// Switch room
function switchRoom(room) {
    currentData.currentRoom = room;
    
    const roomTitles = {
        all: 'ALL ROOMS',
        livingRoom: 'LIVING ROOM',
        bedroom: 'BEDROOM',
        kitchen: 'KITCHEN'
    };
    
    document.getElementById('currentRoomTitle').textContent = roomTitles[room];
    
    // Load room data
    if (room === 'all') {
        document.getElementById('inputPM25').value = currentData.pm25;
        document.getElementById('inputCO2').value = currentData.co2;
        document.getElementById('inputVOC').value = currentData.voc;
        document.getElementById('inputHumidity').value = currentData.humidity;
        document.getElementById('inputTemp').value = currentData.temp;
    } else {
        const roomData = currentData.rooms[room];
        document.getElementById('inputPM25').value = roomData.pm25;
        document.getElementById('inputCO2').value = roomData.co2;
        document.getElementById('inputVOC').value = roomData.voc;
        document.getElementById('inputHumidity').value = roomData.humidity;
        document.getElementById('inputTemp').value = roomData.temp;
    }
    
    updateStatusDisplay();
    showNotification(`Switched to ${roomTitles[room]}`);
}

// Update value
async function updateValue(sensor) {
    let value;
    
    switch(sensor) {
        case 'pm25':
            value = parseInt(document.getElementById('inputPM25').value);
            break;
        case 'co2':
            value = parseInt(document.getElementById('inputCO2').value);
            break;
        case 'voc':
            value = parseInt(document.getElementById('inputVOC').value);
            break;
        case 'humidity':
            value = parseInt(document.getElementById('inputHumidity').value);
            break;
        case 'temp':
            value = parseFloat(document.getElementById('inputTemp').value);
            break;
    }
    
    // Update data
    if (currentData.currentRoom === 'all') {
        currentData[sensor] = value;
        // Update all rooms with average
        Object.keys(currentData.rooms).forEach(room => {
            currentData.rooms[room][sensor] = value;
        });
    } else {
        currentData.rooms[currentData.currentRoom][sensor] = value;
        // Recalculate average
        const rooms = Object.values(currentData.rooms);
        currentData[sensor] = Math.round(
            rooms.reduce((sum, room) => sum + room[sensor], 0) / rooms.length
        );
    }
    
    await sendToAPI();
    checkAutomation();
    updateStatusDisplay();
    showNotification(`Updated ${sensor.toUpperCase()} to ${value}`);
}

// Toggle device
async function toggleDevice(deviceId) {
    const checkbox = document.getElementById(`toggle${deviceId.charAt(0).toUpperCase() + deviceId.slice(1)}`);
    currentData.devices[deviceId].active = checkbox.checked;
    
    if (deviceId === 'intakeFan') {
        const speedControl = document.getElementById('fanSpeedControl');
        if (checkbox.checked) {
            speedControl.style.display = 'flex';
            currentData.devices.intakeFan.speed = document.getElementById('fanSpeed').value;
        } else {
            speedControl.style.display = 'none';
            currentData.devices.intakeFan.speed = 0;
        }
    }
    
    await sendToAPI();
    showNotification(`${deviceId} is now ${checkbox.checked ? 'ON' : 'OFF'}`);
}

// Update fan speed
async function updateFanSpeed() {
    const speed = document.getElementById('fanSpeed').value;
    document.getElementById('speedValue').textContent = `${speed}%`;
    currentData.devices.intakeFan.speed = parseInt(speed);
    await sendToAPI();
}

// Toggle rule
function toggleRule(rule) {
    const checkbox = document.getElementById(`rule${rule.charAt(0).toUpperCase() + rule.slice(1)}`);
    currentData.rules[rule] = checkbox.checked;
    checkAutomation();
    showNotification(`Rule ${rule} ${checkbox.checked ? 'enabled' : 'disabled'}`);
}

// Check automation
function checkAutomation() {
    const avgData = currentData;
    
    if (currentData.rules.pm25 && avgData.pm25 > 25) {
        document.getElementById('toggleAirPurifier').checked = true;
        currentData.devices.airPurifier.active = true;
    } else if (currentData.rules.pm25 && avgData.pm25 < 12) {
        document.getElementById('toggleAirPurifier').checked = false;
        currentData.devices.airPurifier.active = false;
    }
    
    if (currentData.rules.co2 && avgData.co2 > 1000) {
        document.getElementById('toggleWindowServo').checked = true;
        document.getElementById('toggleIntakeFan').checked = true;
        currentData.devices.windowServo.active = true;
        currentData.devices.intakeFan.active = true;
        document.getElementById('fanSpeedControl').style.display = 'flex';
        document.getElementById('fanSpeed').value = 75;
        document.getElementById('speedValue').textContent = '75%';
        currentData.devices.intakeFan.speed = 75;
    } else if (currentData.rules.co2 && avgData.co2 < 800) {
        document.getElementById('toggleWindowServo').checked = false;
        currentData.devices.windowServo.active = false;
    }
    
    if (currentData.rules.voc && avgData.voc > 100) {
        document.getElementById('toggleHepaFilter').checked = true;
        currentData.devices.hepaFilter.active = true;
    }
    
    sendToAPI();
}

// Set scenario
function setScenario(type) {
    const scenarios = {
        good: { pm25: 8, co2: 400, voc: 15, humidity: 50, temp: 25 },
        moderate: { pm25: 35, co2: 850, voc: 80, humidity: 65, temp: 30 },
        poor: { pm25: 75, co2: 1500, voc: 200, humidity: 75, temp: 33 },
        reset: { pm25: 12, co2: 450, voc: 20, humidity: 55, temp: 28 }
    };
    
    if (type === 'reset') {
        document.querySelectorAll('.toggle-switch input').forEach(cb => cb.checked = false);
        Object.keys(currentData.devices).forEach(key => {
            currentData.devices[key].active = false;
            if (key === 'intakeFan') currentData.devices[key].speed = 0;
        });
    }
    
    const values = scenarios[type];
    Object.keys(values).forEach(key => {
        const inputId = `input${key.charAt(0).toUpperCase() + key.slice(1)}`;
        document.getElementById(inputId).value = values[key];
        
        if (currentData.currentRoom === 'all') {
            currentData[key] = values[key];
            Object.keys(currentData.rooms).forEach(room => {
                currentData.rooms[room][key] = values[key];
            });
        } else {
            currentData.rooms[currentData.currentRoom][key] = values[key];
        }
    });
    
    sendToAPI();
    checkAutomation();
    updateStatusDisplay();
    showNotification(`Scenario: ${type.toUpperCase()} applied`);
}

// Send to API
async function sendToAPI() {
    try {
        const response = await fetch(`${API_URL}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentData)
        });
        
        if (response.ok) {
            console.log('Data synced to server');
        }
    } catch (error) {
        console.warn('Running in offline mode');
    }
}

// Update status display
function updateStatusDisplay() {
    const room = currentData.currentRoom;
    let displayData = room === 'all' ? currentData : currentData.rooms[room];
    
    document.getElementById('statusDisplay').innerHTML = `
        <p>PM2.5: <strong>${displayData.pm25}</strong> µg/m³</p>
        <p>CO₂: <strong>${displayData.co2}</strong> ppm</p>
        <p>VOC: <strong>${displayData.voc}</strong> ppb</p>
        <p>Humidity: <strong>${displayData.humidity}</strong> %</p>
        <p>Temperature: <strong>${displayData.temp}</strong> °C</p>
    `;
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: #00d9ff; color: #1a1a1a;
        padding: 15px 25px; font-weight: 700;
        letter-spacing: 1px; z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Initialize
window.addEventListener('load', () => {
    updateStatusDisplay();
    setInterval(sendToAPI, 5000); // Auto-sync every 5 seconds
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
