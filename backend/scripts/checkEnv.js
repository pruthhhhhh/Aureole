/**
 * Razorpay Diagnostic Script
 * Checks for required environment variables without printing secrets
 */

require('dotenv').config();

console.log('🔍 Running Razorpay Diagnostics...\n');

const keys = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'MONGODB_URI',
    'JWT_SECRET'
];

let allFine = true;

keys.forEach(key => {
    const val = process.env[key];
    if (!val) {
        console.log(`❌ ${key}: MISSING`);
        allFine = false;
    } else if (val === 'your_razorpay_key_id' || val === 'your_razorpay_key_secret') {
        console.log(`⚠️  ${key}: Still using PLACEHOLDER value`);
        allFine = false;
    } else {
        console.log(`✅ ${key}: Configured (Length: ${val.length})`);
    }
});

if (allFine) {
    console.log('\n🚀 Everything looks configured correctly!');
} else {
    console.log('\n❌ Configuration issues found. Please check your backend/.env file.');
}
