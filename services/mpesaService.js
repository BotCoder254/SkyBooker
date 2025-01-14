const axios = require('axios');
const moment = require('moment');

const CONSUMER_KEY = "frmypHgIJYc7mQuUu5NBvnYc0kF1StP3";
const CONSUMER_SECRET = "UAeJAJLNUkV5MLpL";
const BUSINESS_SHORT_CODE = "4121151";
const PASSKEY = "68cb945afece7b529b4a0901b2d8b1bb3bd9daa19bfdb48c69bec8dde962a932";
const CALLBACK_URL = "https://your-domain.com/api/payments/callback"; // Update this

// Get M-Pesa access token
async function getAccessToken() {
    const url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = "Basic " + Buffer.from(CONSUMER_KEY + ":" + CONSUMER_SECRET).toString("base64");

    try {
        const response = await axios.get(url, {
            headers: { Authorization: auth }
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

// Initiate STK Push
async function initiateSTKPush(phoneNumber, amount, bookingReference) {
    try {
        const accessToken = await getAccessToken();
        const url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer.from(
            BUSINESS_SHORT_CODE + PASSKEY + timestamp
        ).toString('base64');

        const requestData = {
            BusinessShortCode: BUSINESS_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: BUSINESS_SHORT_CODE,
            PhoneNumber: phoneNumber,
            CallBackURL: CALLBACK_URL,
            AccountReference: bookingReference,
            TransactionDesc: "Flight Booking Payment"
        };

        const response = await axios.post(url, requestData, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error initiating STK push:', error);
        throw error;
    }
}

// Query STK Push Status
async function queryTransactionStatus(checkoutRequestID) {
    try {
        const accessToken = await getAccessToken();
        const url = "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query";
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer.from(
            BUSINESS_SHORT_CODE + PASSKEY + timestamp
        ).toString('base64');

        const requestData = {
            BusinessShortCode: BUSINESS_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestID
        };

        const response = await axios.post(url, requestData, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error querying transaction status:', error);
        throw error;
    }
}

// Process callback from M-Pesa
function processCallback(callbackData) {
    const resultCode = callbackData.Body.stkCallback.ResultCode;
    const resultDesc = callbackData.Body.stkCallback.ResultDesc;
    const merchantRequestID = callbackData.Body.stkCallback.MerchantRequestID;
    const checkoutRequestID = callbackData.Body.stkCallback.CheckoutRequestID;

    let mpesaReceiptNumber = null;
    let amount = null;
    let phoneNumber = null;
    let transactionDate = null;

    if (resultCode === 0) {
        const callbackMetadata = callbackData.Body.stkCallback.CallbackMetadata.Item;
        mpesaReceiptNumber = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber').Value;
        amount = callbackMetadata.find(item => item.Name === 'Amount').Value;
        phoneNumber = callbackMetadata.find(item => item.Name === 'PhoneNumber').Value;
        transactionDate = callbackMetadata.find(item => item.Name === 'TransactionDate').Value;
    }

    return {
        success: resultCode === 0,
        resultCode,
        resultDesc,
        merchantRequestID,
        checkoutRequestID,
        mpesaReceiptNumber,
        amount,
        phoneNumber,
        transactionDate
    };
}

module.exports = {
    initiateSTKPush,
    queryTransactionStatus,
    processCallback
}; 