// Google Apps Script - Web App endpoint
// Sheet: first tab named "Requests"
// Features: append header if missing, log fields, send email and optional SMS (via carrier gateways)

const SHEET_ID = '1Cyqb3Qv30T-v-kM3-A9_b9s3AX9gOhY3D5y4FICshQ8';
const SHEET_NAME = 'Requests';
const OWNER_EMAIL = 'coltienkk@gmail.com';

function doPost(e){
  try{
    const body = e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(body);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    ensureHeaders_(sheet);

    const row = buildRow_(data);
    sheet.appendRow(row);

    // Send email confirmations
    const subject = `[ColtienKK] Booking Confirmed — ${data.service} on ${data.date} ${data.time}`;
    const html = makeEmailHtml_(data);
    MailApp.sendEmail({to: data.email, subject, htmlBody: html});
    MailApp.sendEmail({to: OWNER_EMAIL, subject: '[COPY] '+subject, htmlBody: html});

    // Optional SMS via carrier gateways
    if (data.carrier && data.phone){
      const gateway = carrierGateway_(data.carrier);
      if(gateway){
        const smsTo = normalizePhone_(data.phone) + '@' + gateway;
        const smsText = `ColtienKK: ${data.service} ${data.date} ${data.time}. Quote: $${data.quote.total}. Pickup: ${fullAddr_(data.pickup)} -> Drop: ${fullAddr_(data.drop)}.`;
        MailApp.sendEmail({to: smsTo, subject: 'ColtienKK', body: smsText});
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureHeaders_(sheet){
  const headers = [
    'Submitted At','Version','Service','Other Details',
    'Name','Phone','Email','Carrier',
    'Pickup Address','Pickup City','Pickup State','Pickup ZIP',
    'Drop Address','Drop City','Drop State','Drop ZIP',
    'Date','Time','Wait (mins)','Notes',
    'Office Address','Office City','Office State','Office ZIP',
    'Miles','Base Rate','$ / Mile','Wait $/min','Free Wait (mins)','Quote Total'
  ];
  const firstRow = sheet.getRange(1,1,1,headers.length).getValues()[0];
  const isEmpty = firstRow.every(v => v === '');
  if(isEmpty){
    sheet.getRange(1,1,1,headers.length).setValues([headers]);
  }
}

function buildRow_(d){
  return [
    d.submittedAt || new Date().toISOString(),
    d.version || '',
    d.service || '',
    d.otherDetails || '',
    d.name || '',
    d.phone || '',
    d.email || '',
    d.carrier || '',
    d.pickup?.address || '', d.pickup?.city || '', d.pickup?.state || '', d.pickup?.zip || '',
    d.drop?.address || '', d.drop?.city || '', d.drop?.state || '', d.drop?.zip || '',
    d.date || '', d.time || '', d.waitMins || 0, d.notes || '',
    d.office?.address || '', d.office?.city || '', d.office?.state || '', d.office?.zip || '',
    d.quote?.miles || 0,
    d.quote?.rates?.base || 0,
    d.quote?.rates?.perMile || 0,
    d.quote?.rates?.waitPerMin || 0,
    d.quote?.rates?.freeWaitMins || 10,
    d.quote?.total || 0
  ];
}

function makeEmailHtml_(d){
  return `
  <div style="font-family:Arial,Helvetica,sans-serif">
    <h2>Thanks for booking with ColtienKK Errands & Ride</h2>
    <p>Hi ${escapeHtml_(d.name)}, your request has been received.</p>
    <table style="border-collapse:collapse">
      <tr><td style="padding:4px 8px"><b>Service</b></td><td style="padding:4px 8px">${escapeHtml_(d.service)}</td></tr>
      ${d.otherDetails ? `<tr><td style="padding:4px 8px"><b>Details</b></td><td style="padding:4px 8px">${escapeHtml_(d.otherDetails)}</td></tr>` : ''}
      <tr><td style="padding:4px 8px"><b>Date & Time</b></td><td style="padding:4px 8px">${escapeHtml_(d.date)} ${escapeHtml_(d.time)}</td></tr>
      <tr><td style="padding:4px 8px"><b>Pickup</b></td><td style="padding:4px 8px">${escapeHtml_(fullAddr_(d.pickup))}</td></tr>
      <tr><td style="padding:4px 8px"><b>Drop-off</b></td><td style="padding:4px 8px">${escapeHtml_(fullAddr_(d.drop))}</td></tr>
      <tr><td style="padding:4px 8px"><b>Estimated Miles</b></td><td style="padding:4px 8px">${escapeHtml_(String(d.quote?.miles || 0))}</td></tr>
      <tr><td style="padding:4px 8px"><b>Quote Total</b></td><td style="padding:4px 8px"><b>$${escapeHtml_(String(d.quote?.total || 0))}</b></td></tr>
    </table>
    <p>If anything looks off, reply to this email.</p>
    <p>— ColtienKK</p>
  </div>`;
}

function carrierGateway_(c){
  switch(String(c||'').toLowerCase()){
    case 'att': return 'txt.att.net';
    case 'tmobile': return 'tmomail.net';
    case 'verizon': return 'vtext.com';
    case 'uscellular': return 'email.uscc.net';
    default: return '';
  }
}
function normalizePhone_(p){ return String(p||'').replace(/\D/g,''); }
function fullAddr_(a){ return `${a.address}, ${a.city}, ${a.state} ${a.zip}`; }
function escapeHtml_(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Simple GET endpoint for health checks and quick tests.
// Examples:
//  ?mode=ping      -> {"ok":true,"message":"pong"}
//  ?mode=status    -> HTML status page (default)
//  ?mode=test      -> returns a sample row would-be-appended (no write)
function doGet(e){
  try{
    var mode = (e && e.parameter && e.parameter.mode) || 'status';
    if (mode === 'ping'){
      return json_({ ok:true, message:'pong', time:(new Date()).toISOString() });
    }
    if (mode === 'test'){
      var sample = {
        version:'v1.0.0',
        service:'Ride (Point to Point)',
        otherDetails:'',
        name:'Test User',
        phone:'5632711186',
        email:'coltienkk@gmail.com',
        carrier:'',
        pickup:{address:'2617 Evergreen Drive', city:'Burlington', state:'IA', zip:'52601'},
        drop:{address:'3001 Winegard Dr', city:'Burlington', state:'IA', zip:'52601'},
        date:'2025-09-08',
        time:'09:00',
        waitMins:0,
        notes:'',
        quote:{ total:25.50, miles:6.2, rates:{base:10, perMile:1.90, waitPerMin:0.5, freeWaitMins:10}},
        office:{address:'2617 Evergreen Drive', city:'Burlington', state:'IA', zip:'52601'},
        business:{name:'ColtienKK Errands & Ride', email:'coltienkk@gmail.com', phone:'5632711186'},
        submittedAt:(new Date()).toISOString()
      };
      return json_({ ok:true, sampleRow: buildRow_(sample) });
    }

    // default 'status' mode: ensure headers and return a small HTML page
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    ensureHeaders_(sheet);
    var html = HtmlService.createHtmlOutput(
      '<div style="font-family:Arial;padding:16px">' +
      '<h2>ColtienKK Booking Webhook</h2>' +
      '<p>Status: <b>OK</b> — sheet "<code>'+SHEET_NAME+'</code>" on ID <code>'+SHEET_ID+'</code>.</p>' +
      '<p>Try <code>?mode=ping</code> or <code>?mode=test</code>.</p>' +
      '</div>'
    );
    return html;
  }catch(err){
    return json_({ok:false, error:String(err)});
  }
}
