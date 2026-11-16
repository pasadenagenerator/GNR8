/** Exact trusted bytes; no source script or browser recipient is accepted. */
export const CONTACT_FORM_SCRIPT = String.raw`(()=>{
for(const form of document.querySelectorAll('form[data-gnr8-contact="v1"]')){
 const status=form.querySelector('[data-gnr8-contact-status]');
 let busy=false,complete=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||complete||!form.reportValidity())return;
  const key=form.elements.namedItem('requestId');
  if(!key.value)key.value=crypto.randomUUID();
  busy=true;form.setAttribute('aria-busy','true');
  const button=form.querySelector('[type="submit"]');button.disabled=true;
  status.textContent='Pošiljanje …';
  try{
   const response=await fetch(form.action,{method:'POST',headers:{Accept:'application/json'},body:new URLSearchParams(new FormData(form))});
   const result=await response.json();
   if(!response.ok||result.status!=='notification_accepted')throw new Error('submit_failed');
   complete=true;status.textContent='Sporočilo je shranjeno in sprejeto v pošiljanje. Prejem v nabiralnik ni potrjen.';
  }catch{status.textContent='Sporočila ni bilo mogoče potrditi. Poskusite znova ali uporabite kontaktne podatke na strani.';}
  finally{busy=false;form.removeAttribute('aria-busy');button.disabled=complete;}
 });
}
})();`
