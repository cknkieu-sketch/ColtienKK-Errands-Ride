/* ColtienKK front-end logic
   Sections:
   1) Helpers & Config
   2) ORS Geocoding & Distance
   3) Quote Calculation
   4) Form Handling & Validation
   5) GAS Submission & Confirmations
*/

// ===== 1) Helpers & Config =====
const DEFAULT_CONFIG = window.CKK_CONFIG || {};
function getConfig(){
  // merge defaults with any admin overrides from localStorage
  const adm = JSON.parse(localStorage.getItem('ckk_admin')||'{}');
  return {
    ...DEFAULT_CONFIG,
    office: { ...DEFAULT_CONFIG.office, ...(adm.office||{}) },
    rates: { ...DEFAULT_CONFIG.rates, ...(adm.rates||{}) },
    orsKey: adm.orsKey || DEFAULT_CONFIG.orsKey,
    gasWebAppUrl: adm.gasWebAppUrl || DEFAULT_CONFIG.gasWebAppUrl
  };
}
function money(n){ return `$${(Math.round(n*100)/100).toFixed(2)}`; }
function toMiles(meters){ return meters / 1609.344; }
function byId(id){ return document.getElementById(id); }

// Prefill Burlington, IA 52601
window.addEventListener('DOMContentLoaded', () => {
  byId('pickupCity').value = 'Burlington';
  byId('pickupZip').value = '52601';
  byId('dropCity').value = 'Burlington';
  byId('dropZip').value = '52601';

  // default to next-day 9:00am Central
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 9, 0, 0);
  byId('date').value = next.toISOString().slice(0,10);
  byId('time').value = String(next.getHours()).padStart(2,'0')+':'+String(next.getMinutes()).padStart(2,'0');
});

// Toggle Other describe
byId('service').addEventListener('change', (e)=>{
  byId('otherWrap').classList.toggle('hidden', e.target.value !== 'Other (describe)');
});

// ===== 2) ORS Geocoding & Distance =====
async function geocode(addr){
  const cfg = getConfig();
  const text = encodeURIComponent(addr);
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${atob(cfg.orsKey)}&text=${text}&boundary.country=US&size=1`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if(!data.features || !data.features.length) throw new Error('Address not found');
  const [lon, lat] = data.features[0].geometry.coordinates;
  return {lat, lon, label: data.features[0].properties.label};
}

async function routeDistanceMeters(a, b){
  const cfg = getConfig();
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${atob(cfg.orsKey)}`;
  const body = {
    coordinates: [[a.lon, a.lat],[b.lon, b.lat]]
  };
  const res = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  if(!res.ok){
    const t = await res.text();
    throw new Error('Routing failed: '+t);
  }
  const data = await res.json();
  return data.routes[0].summary.distance; // meters
}

async function computeLegsAndDistance(officeAddr, pickupAddr, dropAddr){
  const [o,p,d] = await Promise.all([geocode(officeAddr), geocode(pickupAddr), geocode(dropAddr)]);
  const [op, pd, dof] = await Promise.all([
    routeDistanceMeters(o,p),
    routeDistanceMeters(p,d),
    routeDistanceMeters(d,o)
  ]);
  return {meters: op + pd + dof, legs:{op, pd, dof}, points:{o,p,d}};
}

// ===== 3) Quote Calculation =====
async function calculateQuote(){
  const cfg = getConfig();

  // Build full strings
  const pickup = `${byId('pickupAddress').value}, ${byId('pickupCity').value}, ${byId('pickupState').value} ${byId('pickupZip').value}`;
  const drop = `${byId('dropAddress').value}, ${byId('dropCity').value}, ${byId('dropState').value} ${byId('dropZip').value}`;
  const office = `${cfg.office.address}, ${cfg.office.city}, ${cfg.office.state} ${cfg.office.zip}`;

  const wait = Number(byId('wait').value||0);
  const waitBillable = Math.max(0, wait - Number(cfg.rates.freeWaitMins));
  const waitCost = waitBillable * Number(cfg.rates.waitPerMin);

  const result = await computeLegsAndDistance(office, pickup, drop);
  const miles = toMiles(result.meters);
  const distanceCost = miles * Number(cfg.rates.perMile);
  const total = Number(cfg.rates.base) + distanceCost + waitCost;

  byId('quoteTotal').textContent = money(total);
  byId('distanceTotal').textContent = `${miles.toFixed(1)} mi`;
  byId('quoteBreakdown').innerHTML = [
    `Base: <b>${money(cfg.rates.base)}</b>`,
    `Distance: <b>${miles.toFixed(1)} mi</b> × ${money(cfg.rates.perMile)}/mi = <b>${money(distanceCost)}</b>`,
    `Wait: ${wait} min (first ${cfg.rates.freeWaitMins} free) = <b>${money(waitCost)}</b>`
  ].join(' · ');

  return {total, miles, legs: result.legs};
}

// ===== 4) Form Handling & Validation =====
function validateForm(){
  const requiredIds = ['service','name','phone','email','pickupAddress','pickupCity','pickupState','pickupZip','dropAddress','dropCity','dropState','dropZip','date','time'];
  for(const id of requiredIds){
    const el = byId(id);
    if(!el.value){ el.focus(); throw new Error('Please complete all required fields.'); }
  }
  // simple ZIP check
  if(!/^\d{5}(-\d{4})?$/.test(byId('pickupZip').value)) throw new Error('Pickup ZIP looks invalid.');
  if(!/^\d{5}(-\d{4})?$/.test(byId('dropZip').value)) throw new Error('Drop-off ZIP looks invalid.');
  // simple phone check
  if(!/[0-9]{10}/.test(byId('phone').value.replace(/\D/g,''))) throw new Error('Phone looks invalid.');
}

byId('calcBtn').addEventListener('click', async ()=>{
  try{
    validateForm();
    byId('calcBtn').disabled = true;
    const {total} = await calculateQuote();
    byId('bookBtn').disabled = false;
  }catch(err){
    alert(err.message||String(err));
  }finally{
    byId('calcBtn').disabled = false;
  }
});

// ===== 5) GAS Submission & Confirmations =====
byId('bookingForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    validateForm();
    const cfg = getConfig();
    if(!/^https?:\/\//.test(cfg.gasWebAppUrl)){
      alert('Admin: Please set your Google Apps Script Web App URL in Admin.');
      return;
    }
    const {total, miles, legs} = await calculateQuote();
    console.debug('[CKK] Submitting payload to GAS:', cfg.gasWebAppUrl, payload);

    const payload = {
      version: byId('version').value,
      service: byId('service').value,
      otherDetails: byId('otherDetails').value || '',
      name: byId('name').value,
      phone: byId('phone').value,
      email: byId('email').value,
      carrier: byId('carrier').value || '',
      pickup: {
        address: byId('pickupAddress').value, city: byId('pickupCity').value,
        state: byId('pickupState').value, zip: byId('pickupZip').value
      },
      drop: {
        address: byId('dropAddress').value, city: byId('dropCity').value,
        state: byId('dropState').value, zip: byId('dropZip').value
      },
      date: byId('date').value,
      time: byId('time').value,
      waitMins: Number(byId('wait').value||0),
      notes: byId('notes').value||'',
      quote: {
        total, miles: Number(miles.toFixed(2)),
        legsMeters: legs,
        rates: cfg.rates
      },
      office: cfg.office,
      business: cfg.business,
      submittedAt: new Date().toISOString()
    };

    const res = await fetch(cfg.gasWebAppUrl, {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(payload)});
    if(!res.ok){ const txt = await res.text(); console.error('[CKK] GAS response not OK:', res.status, txt); throw new Error('Error sending booking: ' + res.status + ' ' + txt); }
    const data = await res.json();

    alert('Booked! A confirmation has been sent to your email' + (payload.carrier ? ' / phone.' : '.'));
    e.target.reset();
    byId('bookBtn').disabled = true;
    // prefill city/zip again
    byId('pickupCity').value = 'Burlington'; byId('pickupZip').value = '52601';
    byId('dropCity').value = 'Burlington'; byId('dropZip').value = '52601';
  }catch(err){
    alert(err.message||String(err));
  }
});
