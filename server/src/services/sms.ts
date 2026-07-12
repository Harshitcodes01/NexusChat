export const sendSMS = async (to: string, message: string): Promise<void> => {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', TWILIO_PHONE_NUMBER);
      params.append('Body', message);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Twilio SMS Error] HTTP status ${response.status}: ${errorText}`);
      } else {
        console.log(`[Twilio SMS] Message successfully dispatched to ${to}`);
        return;
      }
    } catch (err) {
      console.error('[Twilio SMS Connection Error] Failed:', err);
    }
  }

  // Fallback to Mock Logger in console
  console.log('\n================================ MOCK SMS LOG ================================');
  console.log(`To Phone Number: ${to}`);
  console.log(`Message: ${message}`);
  console.log('==============================================================================\n');
};
