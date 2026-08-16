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

  console.log(`Mailbox: Polling for ${type} email to ${recipient} after ${afterTimestamp}`);

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${MAIL_API_BASE}${MESSAGES_ENDPOINT}`);
      
      if (!response.ok) {
        throw new Error(`Mailbox: HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const messages = data.items || data.messages || [];

      // Filter messages by recipient and timestamp
      const matchingMessages = messages.filter(msg => {
        const msgRecipient = msg.To?.[0]?.Address || msg.to?.[0]?.Address || msg.recipient || '';
        const msgTimestamp = new Date(msg.Created || msg.created || msg.timestamp).getTime();
        
        return (
          msgRecipient === recipient &&
          msgTimestamp >= afterTimestamp &&
          (type === 'confirmation' 
            ? (msg.Subject?.includes('confirm') || msg.subject?.includes('Confirm') || msg.Content?.Body?.includes('confirm'))
            : (msg.Subject?.includes('reset') || msg.subject?.includes('Reset') || msg.Content?.Body?.includes('reset') || msg.Content?.Body?.includes('password'))
          )
        );
      });

      if (matchingMessages.length > 0) {
        const msg = matchingMessages[0];
        console.log(`Mailbox: Found ${type} email for ${recipient}`);

        // Extract action link from email body
        const body = msg.Content?.Body || msg.body || msg.text || '';
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

  console.log(`Mailbox: Timeout waiting for ${type} email to ${recipient}`);
  return {
    found: false,
    subject: '',
    link: ''
  };
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

module.exports = {
  pollForEmail
};
