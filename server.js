require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const { Buffer } = require('buffer');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve env.js dynamically
app.get('/js/env.js', (req, res) => {
    const envData = {
        CYBERSOURCE_BASE_URL_ID: process.env.CYBERSOURCE_BASE_URL_ID,
        CYBERSOURCE_METHOD_ID: process.env.CYBERSOURCE_METHOD_ID,
        PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
        PAYPAL_CURRENCY: process.env.PAYPAL_CURRENCY || 'GBP',
        PAYPAL_BASE_URL_ID: process.env.PAYPAL_BASE_URL_ID,
        PAYPAL_METHOD_ID: process.env.PAYPAL_METHOD_ID,
        PAYPAL_ENV: process.env.PAYPAL_ENV || 'sandbox'
    };
    res.set('Content-Type', 'application/javascript');
    res.send(`const AppEnv = ${JSON.stringify(envData)};`);
});

function getPaypalHost() {
    return (process.env.PAYPAL_ENV || 'sandbox') === 'live' ? 'api-m.paypal.com' : 'api-m.sandbox.paypal.com';
}

function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function getAccessToken() {
    const host = getPaypalHost();
    const clientId = process.env.PAYPAL_CLIENT_ID || '';
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = 'grant_type=client_credentials';
    const options = {
        hostname: host,
        path: '/v1/oauth2/token',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
    };
    const res = await httpsRequest(options, body);
    if (res.statusCode >= 200 && res.statusCode < 300 && res.body.access_token) {
        return res.body.access_token;
    }
    throw new Error('Failed to obtain PayPal access token');
}

app.post('/api/paypal/orders/create', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        const host = getPaypalHost();
        const amount = req.body.amount || '1.00';
        const currency = req.body.currency || (process.env.PAYPAL_CURRENCY || 'GBP');
        const body = JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{ amount: { currency_code: currency, value: amount } }]
        });
        const options = {
            hostname: host,
            path: '/v2/checkout/orders',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        const resp = await httpsRequest(options, body);
        res.status(resp.statusCode).json(resp.body);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/paypal/orders/:orderId/capture', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        const host = getPaypalHost();
        const orderId = req.params.orderId;
        const options = {
            hostname: host,
            path: `/v2/checkout/orders/${orderId}/capture`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        const resp = await httpsRequest(options, '');
        res.status(resp.statusCode).json(resp.body);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '.')));

// HTTPS Options
const httpsOptions = {
    key: fs.readFileSync('localhost+2-key.pem'),
    cert: fs.readFileSync('localhost+2.pem')
};

const server = https.createServer(httpsOptions, app);

server.listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
});
