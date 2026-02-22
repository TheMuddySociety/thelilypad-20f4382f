import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PINATA_JWT = process.env.VITE_PINATA_JWT;

async function testAuth() {
    if (!PINATA_JWT) {
        console.error('Error: VITE_PINATA_JWT not found in .env');
        process.exit(1);
    }

    console.log('Testing Pinata Authentication...');

    try {
        const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${PINATA_JWT}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Authentication Successful!');
            console.log('Response:', data);
        } else {
            const error = await response.text();
            console.error(`❌ Authentication Failed (${response.status}):`, error);
        }
    } catch (err) {
        console.error('❌ Network Error:', err);
    }
}

testAuth();
