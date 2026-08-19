/**
 * Preflight diagnostic for Supabase Auth and Mailpit
 * Tests the complete email delivery chain independently of the UI
 */

const MAIL_API_BASE = 'http://127.0.0.1:54324';
const MESSAGES_ENDPOINT = '/api/v1/messages';
const MESSAGE_ENDPOINT = '/api/v1/message';

async function runPreflight(supabaseUrl, supabaseAnonKey) {
  console.log('=== SUPABASE AUTH/MAILPIT PREFLIGHT ===');
  
  const timestamp = Date.now();
  const syntheticEmail = `nexora-preflight-${timestamp}@example.test`;
  const syntheticPassword = `Preflight${timestamp}!SecureP@ssw0rd`;
  
  console.log(`PREFLIGHT timestamp=${timestamp}`);
  console.log(`PREFLIGHT synthetic_email=${syntheticEmail}`);
  
  // Step 1: Check Mailpit API availability
  console.log('PREFLIGHT Step 1: Check Mailpit API');
  try {
    const mailpitResponse = await fetch(`${MAIL_API_BASE}${MESSAGES_ENDPOINT}`);
    const mailpitData = await mailpitResponse.json();
    const initialCount = mailpitData.messages?.length || 0;
    console.log(`PREFLIGHT mailpit_api=PASS`);
    console.log(`PREFLIGHT initial_message_count=${initialCount}`);
  } catch (error) {
    console.log(`PREFLIGHT mailpit_api=FAIL`);
    console.log(`PREFLIGHT mailpit_error=${error.message}`);
    return { result: 'FAIL', stage: 'mailpit_api' };
  }
  
  // Step 2: Test direct SMTP probe to Mailpit
  console.log('PREFLIGHT Step 2: Direct SMTP probe to Mailpit');
  try {
    // This would require SMTP client library, but we can test if port is reachable
    // For now, we'll skip the direct SMTP test and rely on the Auth test
    console.log(`PREFLIGHT smtp_probe=SKIPPED`);
  } catch (error) {
    console.log(`PREFLIGHT smtp_probe=FAIL`);
    console.log(`PREFLIGHT smtp_error=${error.message}`);
  }
  
  // Step 3: Test Supabase Auth signup
  console.log('PREFLIGHT Step 3: Direct Supabase Auth signup');
  const signupTimestamp = Date.now();
  console.log(`PREFLIGHT signup_timestamp=${signupTimestamp}`);
  
  try {
    const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: syntheticEmail,
        password: syntheticPassword,
        data: {
          username: 'Preflight User'
        }
      })
    });
    
    const signupStatus = signupResponse.status;
    console.log(`PREFLIGHT signup_http_status=${signupStatus}`);
    
    if (signupStatus === 200 || signupStatus === 201) {
      console.log(`PREFLIGHT signup_http=PASS`);
      const signupData = await signupResponse.json();
      const userPresent = !!signupData.user;
      const sessionPresent = !!signupData.session;
      console.log(`PREFLIGHT user_created=${userPresent ? 'yes' : 'no'}`);
      console.log(`PREFLIGHT session_returned=${sessionPresent ? 'yes' : 'no'}`);
    } else {
      console.log(`PREFLIGHT signup_http=FAIL`);
      const errorText = await signupResponse.text();
      console.log(`PREFLIGHT signup_error=${errorText.substring(0, 200)}`);
      return { result: 'FAIL', stage: 'auth_signup', http_status: signupStatus };
    }
  } catch (error) {
    console.log(`PREFLIGHT signup_network=FAIL`);
    console.log(`PREFLIGHT signup_error=${error.message}`);
    return { result: 'FAIL', stage: 'auth_signup_network' };
  }
  
  // Step 4: Poll for confirmation email
  console.log('PREFLIGHT Step 4: Poll for confirmation email');
  const pollingTimeout = 60000;
  const pollingInterval = 1000;
  const deadline = Date.now() + pollingTimeout;
  let emailFound = false;
  let mailLatency = null;
  
  while (Date.now() < deadline && !emailFound) {
    try {
      const response = await fetch(`${MAIL_API_BASE}${MESSAGES_ENDPOINT}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const messages = data.messages || data.items || [];
      
      const matchingMessage = messages.find(msg => {
        const recipient = msg.To?.[0]?.Address || msg.to?.[0]?.Address || msg.recipient || '';
        const created = new Date(msg.Created || msg.created || msg.timestamp).getTime();
        return recipient === syntheticEmail && created >= signupTimestamp;
      });
      
      if (matchingMessage) {
        emailFound = true;
        mailLatency = Date.now() - signupTimestamp;
        console.log(`PREFLIGHT confirmation_mail=yes`);
        console.log(`PREFLIGHT mail_latency_ms=${mailLatency}`);
        console.log(`PREFLIGHT message_id=${matchingMessage.ID || matchingMessage.id}`);
        console.log(`PREFLIGHT message_subject=${matchingMessage.Subject || matchingMessage.subject}`);
      }
    } catch (error) {
      console.log(`PREFLIGHT poll_error=${error.message}`);
    }
    
    if (!emailFound) {
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }
  }
  
  if (!emailFound) {
    console.log(`PREFLIGHT confirmation_mail=no`);
    console.log(`PREFLIGHT stage=gotrue_mailer`);
    return { result: 'FAIL', stage: 'gotrue_mailer' };
  }
  
  console.log('PREFLIGHT result=PASS');
  return { 
    result: 'PASS', 
    mail_latency_ms: mailLatency,
    signup_http: 200,
    user_created: 'yes',
    confirmation_mail: 'yes'
  };
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
    process.exit(1);
  }
  
  runPreflight(supabaseUrl, supabaseAnonKey)
    .then(result => {
      console.log('=== PREFLIGHT RESULT ===');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.result === 'PASS' ? 0 : 1);
    })
    .catch(error => {
      console.error('PREFLIGHT_UNEXPECTED_ERROR:', error.message);
      process.exit(1);
    });
}

export { runPreflight };