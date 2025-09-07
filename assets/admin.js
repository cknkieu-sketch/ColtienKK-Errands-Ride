// Simple password gate (client-only; change for production if needed)
const ADMIN_PASSWORD = 'ckk-admin-2025';

function getDefaults(){ return window.CKK_CONFIG; }
function load(){
  const saved = JSON.parse(localStorage.getItem('ckk_admin')||'{}');
  const cfg = {...getDefaults(), ...saved};

  // office
  document.getElementById('officeAddress').value = (cfg.office||{}).address || '';
  document.getElementById('officeCity').value = (cfg.office||{}).city || '';
  document.getElementById('officeState').value = (cfg.office||{}).state || '';
  document.getElementById('officeZip').value = (cfg.office||{}).zip || '';

  // rates
  document.getElementById('rateBase').value = (cfg.rates||{}).base ?? '';
  document.getElementById('ratePerMile').value = (cfg.rates||{}).perMile ?? '';
  document.getElementById('rateWait').value = (cfg.rates||{}).waitPerMin ?? '';
  document.getElementById('rateFreeWait').value = (cfg.rates||{}).freeWaitMins ?? '';

  document.getElementById('orsKey').value = cfg.orsKey || '';
  document.getElementById('gasUrl').value = cfg.gasWebAppUrl || '';
}

function save(){
  const payload = {
    office: {
      address: document.getElementById('officeAddress').value,
      city: document.getElementById('officeCity').value,
      state: document.getElementById('officeState').value,
      zip: document.getElementById('officeZip').value
    },
    rates: {
      base: Number(document.getElementById('rateBase').value),
      perMile: Number(document.getElementById('ratePerMile').value),
      waitPerMin: Number(document.getElementById('rateWait').value),
      freeWaitMins: Number(document.getElementById('rateFreeWait').value)
    },
    orsKey: document.getElementById('orsKey').value,
    gasWebAppUrl: document.getElementById('gasUrl').value
  };
  localStorage.setItem('ckk_admin', JSON.stringify(payload));
  alert('Saved. The main page will use these values.');
}

document.getElementById('unlock').addEventListener('click', ()=>{
  const pwd = document.getElementById('pwd').value;
  if(pwd === ADMIN_PASSWORD){
    document.getElementById('lock').classList.add('hidden');
    document.getElementById('panel').classList.remove('hidden');
    load();
  }else{
    alert('Incorrect password');
  }
});
document.getElementById('save').addEventListener('click', save);
document.getElementById('reset').addEventListener('click', ()=>{
  localStorage.removeItem('ckk_admin');
  load();
  alert('Reset to defaults.');
});
