const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/control', express.static(path.join(__dirname, '../backend')));

let sensorData = {
    pm25: 12,
    co2: 450,
    voc: 20,
    humidity: 55,
    temp: 28,
    rooms: {
        livingRoom: {
            pm25: 12,
            co2: 450,
            voc: 20,
            humidity: 55,
            temp: 28
        },
        bedroom: {
            pm25: 10,
            co2: 400,
            voc: 15,
            humidity: 52,
            temp: 26
        },
        kitchen: {
            pm25: 18,
            co2: 600,
            voc: 35,
            humidity: 60,
            temp: 29
        }
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
    },
    timestamp: new Date().toISOString()
};

// Get current data
app.get('/api/sensors', (req, res) => {
    res.json(sensorData);
});

// Update data
app.post('/api/update', (req, res) => {
    sensorData = { ...sensorData, ...req.body, timestamp: new Date().toISOString() };
    console.log('Data updated:', sensorData);
    res.json({ success: true, data: sensorData });
});

// Health check
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve backend control (เพิ่มส่วนนี้)
app.get('/control', (req, res) => {
    res.sendFile(path.join(__dirname, '../backend/control.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
