
const { enrollMarketingLead } = require('../lib/marketing/enroll-lead');
const { sendLeadRegistroNotification } = require('../lib/leads/registro-notification');

async function run() {
  try {
    const input = {
      email: 'yonathan.ponce.hernandez@gmail.com',
      source: 'info',
      fullName: 'Yonathan Miguel Ponce Hernandez',
      phone: '+504****8008',
    };
    
    console.log('Enrolling lead...');
    const result = await enrollMarketingLead(input);
    console.log('Enroll result:', result);
    
    console.log('Sending notification...');
    await sendLeadRegistroNotification({
      source: 'info',
      nombre: input.fullName,
      email: input.email,
      whatsapp: input.phone,
      country_code: 'HND',
    });
    console.log('Notification sent.');
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

run();
