/**
 * Test-only helper for interacting with local Supabase mail capture
 * The local SMTP server runs on port 54324 by default
 * This helper polls for emails and extracts confirmation/recovery links
 */

const MAIL_API_BASE = 'http://127.0.0.1:54324'
const POLL_INTERVAL_MS = 500
const MAX_POLL_TIME_MS = 30000

/**
 * Poll for an email to a specific recipient
 * @param {string} recipient - Email address to poll for
 * @param {string} expectedType - 'confirmation' or 'recovery'
 * @returns {Promise<{found: boolean, link?: string, error?: string}>}
 */
export async function pollForEmail(recipient, expectedType) {
  const startTime = Date.now()
  
  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    try {
      const response = await fetch(`${MAIL_API_BASE}/api/emails`)
      if (!response.ok) {
        throw new Error(`Mail API returned ${response.status}`)
      }
      
      const emails = await response.json()
      
      // Find email to our recipient
      const targetEmail = emails.find(email => 
        email.to && email.to.includes(recipient)
      )
      
      if (targetEmail) {
        // Check if it's the expected type based on subject/content
        const isConfirmation = targetEmail.subject && 
          (targetEmail.subject.toLowerCase().includes('confirm') ||
           targetEmail.subject.toLowerCase().includes('verify'))
        
        const isRecovery = targetEmail.subject &&
          (targetEmail.subject.toLowerCase().includes('reset') ||
           targetEmail.subject.toLowerCase().includes('password') ||
           targetEmail.subject.toLowerCase().includes('recover'))
        
        const typeMatch = expectedType === 'confirmation' ? isConfirmation : isRecovery
        
        if (typeMatch) {
          // Extract the link from the email body
          const linkMatch = targetEmail.html || targetEmail.text || ''
          const urlMatch = linkMatch.match(/https?:\/\/[^\s"<>]+/g)
          
          if (urlMatch && urlMatch.length > 0) {
            // Return the first URL found (should be the confirmation/recovery link)
            return { found: true, link: urlMatch[0] }
          }
          
          return { found: true, error: 'Email found but no link extracted' }
        }
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    } catch (error) {
      // Mail API might not be ready yet, continue polling
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
  }
  
  return { found: false, error: `No ${expectedType} email found for ${recipient} within ${MAX_POLL_TIME_MS}ms` }
}

/**
 * Clear all emails from the local mailbox
 * Useful for test isolation
 */
export async function clearMailbox() {
  try {
    const response = await fetch(`${MAIL_API_BASE}/api/emails`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      console.warn('Failed to clear mailbox:', response.status)
    }
  } catch (error) {
    console.warn('Mailbox clear failed (may not be critical):', error.message)
  }
}
