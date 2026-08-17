/**
 * Real mailbox helper for local Supabase mail service (Mailpit)
 * Polls for emails to synthetic recipients without deleting global mailbox
 */

const MAIL_API_BASE = 'http://127.0.0.1:54324';
const MESSAGES_ENDPOINT = '/api/v1/messages';

/**
 * Poll for email to a specific recipient
 * @param {Object} options
 * @param {string} options.recipient - exact synthetic email address
 * @param {string} options.type - 'confirmation' | 'recovery'
 * @param {number} options.afterTimestamp - timestamp to filter older messages
 * @param {number} options.timeoutMs - polling timeout
 * @param {number} options.intervalMs - polling interval
 * @returns {Promise<{found: boolean, subject: string, link: string}>}
 */
async function pollForEmail({
  recipient,
  type,
  afterTimestamp,
  timeoutMs = 60000,
  intervalMs = 1000
}) {
  const startTime = Date.now();
  const deadline = startTime + timeoutMs;
  let mailboxReachable = false;
  let messageCount = 0;
  let recipientMatched = false;
  let subjectMatched = false;

  console.log(`Mailbox: Polling for ${type} email to ${recipient} after ${afterTimestamp}`);

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${MAIL_API_BASE}${MESSAGES_ENDPOINT}`);
      
      if (!response.ok) {
        throw new Error(`Mailbox: HTTP ${response.status} ${response.statusText}`);
      }

      mailboxReachable = true;
      const data = await response.json();
      const messages = data.items || data.messages || [];
      messageCount = messages.length;

      // Filter messages by recipient and timestamp
      const matchingMessages = messages.filter(msg => {
        const msgRecipient = msg.To?.[0]?.Address || msg.to?.[0]?.Address || msg.recipient || '';
        const msgTimestamp = new Date(msg.Created || msg.created || msg.timestamp).getTime();
        const subject = String(msg.Subject || msg.subject || '').toLowerCase();

        if (msgRecipient === recipient) {
          recipientMatched = true;
        }
        const timestampMatch = msgTimestamp >= afterTimestamp;
        
        let subjectMatch = false;
        if (type === 'confirmation') {
          subjectMatch = subject.includes('confirm') || subject.includes('verify');
        } else if (type === 'recovery') {
          subjectMatch = subject.includes('reset') || subject.includes('recover') || subject.includes('password');
        }
        if (subjectMatch) {
          subjectMatched = true;
        }

        return msgRecipient === recipient && timestampMatch && subjectMatch;
      });

      if (matchingMessages.length > 0) {
        const msg = matchingMessages[0];
        const msgId = msg.ID || msg.id;
        console.log(`Mailbox: Found ${type} email for ${recipient} (ID: ${msgId})`);

        // Fetch complete message by ID to get full body
        const fullMsgResponse = await fetch(`${MAIL_API_BASE}${MESSAGES_ENDPOINT}/${msgId}`);
        if (!fullMsgResponse.ok) {
          throw new Error(`Mailbox: Failed to fetch full message ${msgId}: HTTP ${fullMsgResponse.status}`);
        }
        const fullMsg = await fullMsgResponse.json();

        // Extract body from the actual schema
        const body = fullMsg.Text?.Body || fullMsg.HTML?.Body || fullMsg.text || fullMsg.html || fullMsg.Content?.Body || '';
        const link = extractActionLink(body, type);

        return {
          found: true,
          subject: msg.Subject || msg.subject || '',
          link
        };
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));

    } catch (error) {
      console.log(`Mailbox: Poll attempt failed: ${error.message}`);
      // Don't swallow - surface real errors immediately
      if (!error.message.includes('fetch') && !error.message.includes('network')) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  // Provide specific diagnostic based on polling observations
  if (!mailboxReachable) {
    console.log(`Mailbox: Timeout - mailbox API not reachable at ${MAIL_API_BASE}${MESSAGES_ENDPOINT}`);
    throw new Error(`Mailbox: Timeout - mailbox API not reachable (no successful HTTP response in ${timeoutMs}ms)`);
  } else if (messageCount === 0) {
    console.log(`Mailbox: Timeout - mailbox had 0 messages (possible SMTP/Auth infrastructure issue)`);
    throw new Error(`Mailbox: Timeout - mailbox had 0 messages (SMTP delivery may have failed)`);
  } else if (!recipientMatched) {
    console.log(`Mailbox: Timeout - ${messageCount} messages existed but no recipient matched ${recipient}`);
    throw new Error(`Mailbox: Timeout - messages existed but no recipient matched`);
  } else if (!subjectMatched) {
    console.log(`Mailbox: Timeout - recipient matched but subject classification failed for type=${type}`);
    throw new Error(`Mailbox: Timeout - recipient matched but subject classification failed`);
  } else {
    console.log(`Mailbox: Timeout - message matched but full message body/link extraction failed`);
    throw new Error(`Mailbox: Timeout - message matched but full message body/link extraction failed`);
  }
}

/**
 * Extract Supabase action link from email body
 * @param {string} body - email body text
 * @param {string} type - 'confirmation' | 'recovery'
 * @returns {string} extracted link
 */
function extractActionLink(body, type) {
  // Look for Supabase auth URLs
  const urlRegex = /https?:\/\/[^\s"<>]+\/auth\/(confirm|verify)[^\s"<>]*/g;
  const matches = body.match(urlRegex);
  
  if (matches && matches.length > 0) {
    // Return the first Supabase auth URL found
    return matches[0];
  }

  // Fallback: look for any URL that looks like an action link
  const generalUrlRegex = /https?:\/\/[^\s"<>]+/g;
  const allUrls = body.match(generalUrlRegex);
  
  if (allUrls && allUrls.length > 0) {
    // Prefer URLs with auth, confirm, or verify in the path
    const authUrl = allUrls.find(url => 
      url.includes('auth') || 
      url.includes('confirm') || 
      url.includes('verify') ||
      url.includes('reset') ||
      url.includes('recovery')
    );
    return authUrl || allUrls[0];
  }

  throw new Error(`Mailbox: No action link found in ${type} email`);
}

export { pollForEmail };
