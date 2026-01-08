const https = require('https');

const API_KEY = 'pit-7427e736-d68a-41d8-9e9b-4b824b996926';
const LOCATION_ID = 'peE6XmGYBb1xV0iNbh6C';

const EMAIL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Happy New Year from David Young</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header Image -->
          <tr>
            <td>
              <img src="https://storage.googleapis.com/msgsndr/peE6XmGYBb1xV0iNbh6C/media/ef17b2d7-391a-453e-89bf-7b58cf3f0cac.jpeg" alt="Happy New Year 2026" width="600" style="display: block; width: 100%; height: auto;">
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <h1 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Happy New Year, {{contact.first_name}}!</h1>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                I hope 2026 brings you and your family health, happiness, and prosperity!
              </p>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                A lot has changed since we last connected. On the personal side, I got married and now have two beautiful children. On the professional side, I'm thrilled to announce the launch of <strong>LendWise Mortgage</strong> - a company I've built from the ground up with a vision to transform the lending experience.
              </p>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                At LendWise, we're leveraging artificial intelligence to make the mortgage process faster, smoother, and more transparent than ever before. Here's what that means for you:
              </p>

              <ul style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0 0 15px 0; padding-left: 20px;">
                <li><strong>Instant pre-approvals</strong> - Get qualified in minutes, not days</li>
                <li><strong>Smart document processing</strong> - AI handles the paperwork so you don't have to</li>
                <li><strong>Real-time updates</strong> - Always know exactly where your loan stands</li>
                <li><strong>Personalized rate monitoring</strong> - We watch the market so you get the best timing</li>
                <li><strong>24/7 support</strong> - Questions answered anytime through our AI assistant</li>
              </ul>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                The market cycle that began in early 2022 is showing signs of shifting. If you've been waiting on the sidelines for rates to come down, now is the time to start planning your next move - whether that's purchasing, refinancing, or tapping into your home's equity.
              </p>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                <strong>We're currently 100% operational</strong> with in-house underwriting, processing, and funding. That means faster closings, fewer headaches, and a team that's fully accountable to you from application to keys in hand.
              </p>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                I'd love to stay connected! Follow me on social media to keep up with market insights, rate updates, and the occasional family photo.
              </p>

              <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Here's to a prosperous 2026!
              </p>

              <!-- Signature -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-right: 15px; vertical-align: top;">
                    <img src="https://storage.googleapis.com/msgsndr/peE6XmGYBb1xV0iNbh6C/media/675328c66a590a63ee47ee66.png" alt="David Young" width="100" style="border-radius: 50%;">
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333333;">David Young</p>
                    <p style="margin: 5px 0; font-size: 14px; color: #666666;">CEO & Producing Branch Manager</p>
                    <p style="margin: 5px 0; font-size: 14px; color: #666666;">NMLS# 62043</p>
                    <p style="margin: 5px 0; font-size: 14px; color: #666666;">LendWise Mortgage</p>
                    <p style="margin: 10px 0 5px 0;">
                      <a href="tel:310-954-7772" style="color: #0066cc; text-decoration: none; font-size: 14px;">310-954-7772</a>
                    </p>
                    <p style="margin: 5px 0;">
                      <a href="mailto:david@lendwisemtg.com" style="color: #0066cc; text-decoration: none; font-size: 14px;">david@lendwisemtg.com</a>
                    </p>
                    <!-- Social Icons -->
                    <p style="margin: 15px 0 0 0;">
                      <a href="https://www.instagram.com/david_lendwisemtg" style="text-decoration: none; margin-right: 10px;">
                        <img src="https://storage.googleapis.com/msgsndr/peE6XmGYBb1xV0iNbh6C/media/67532a516a590a2e1f47ef82.png" alt="Instagram" width="24" height="24">
                      </a>
                      <a href="https://www.facebook.com/lendwisemortgage" style="text-decoration: none; margin-right: 10px;">
                        <img src="https://storage.googleapis.com/msgsndr/peE6XmGYBb1xV0iNbh6C/media/67532a51301b4a2a97d63c69.png" alt="Facebook" width="24" height="24">
                      </a>
                      <a href="https://www.linkedin.com/in/davidyounglendwise" style="text-decoration: none;">
                        <img src="https://storage.googleapis.com/msgsndr/peE6XmGYBb1xV0iNbh6C/media/67532a516ce99f5ecdd64c2a.png" alt="LinkedIn" width="24" height="24">
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #999999;">
                LendWise Mortgage | NMLS# 2539617<br>
                15233 Ventura Blvd, Suite 500, Sherman Oaks, CA 91403
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'services.leadconnectorhq.com',
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function findOrCreateContact(email, firstName, lastName) {
  // First search for existing contact
  const searchResult = await apiRequest('POST', '/contacts/search', {
    locationId: LOCATION_ID,
    filters: [
      { field: 'email', operator: 'eq', value: email }
    ],
    pageLimit: 1
  });

  if (searchResult.data.contacts && searchResult.data.contacts.length > 0) {
    console.log('Found existing contact:', searchResult.data.contacts[0].id);
    return searchResult.data.contacts[0].id;
  }

  // Create new contact
  const createResult = await apiRequest('POST', '/contacts/', {
    locationId: LOCATION_ID,
    email: email,
    firstName: firstName,
    lastName: lastName,
    tags: ['test-email']
  });

  if (createResult.data.contact) {
    console.log('Created new contact:', createResult.data.contact.id);
    return createResult.data.contact.id;
  }

  throw new Error('Could not find or create contact: ' + JSON.stringify(createResult.data));
}

async function sendEmail(contactId, subject, html) {
  const result = await apiRequest('POST', '/conversations/messages', {
    type: 'Email',
    contactId: contactId,
    subject: subject,
    html: html,
    emailFrom: 'David Young <david@lendwisemtg.com>'
  });

  return result;
}

async function main() {
  console.log('=== SENDING TEST EMAIL ===\n');

  try {
    // Find or create David Young test contact
    const contactId = await findOrCreateContact(
      'david@lendwisemtg.com',
      'David',
      'Young'
    );

    console.log('Contact ID:', contactId);

    // Send the email
    console.log('\nSending Happy New Year email...');
    const result = await sendEmail(
      contactId,
      'Happy New Year from LendWise Mortgage!',
      EMAIL_HTML
    );

    console.log('\nResult:', JSON.stringify(result, null, 2));

    if (result.status === 200 || result.status === 201) {
      console.log('\n✓ Test email sent successfully to david@lendwisemtg.com');
    } else {
      console.log('\n✗ Failed to send email');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
