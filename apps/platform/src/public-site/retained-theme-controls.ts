/** Owned controllers for recognized retained controls. No captured JavaScript
 * is evaluated. Search reads only the generated route index; consent unlocks
 * only the explicitly validated Google destinations carried by the projection. */
export const RETAINED_THEME_CONTROLS_SCRIPT = String.raw`(()=>{
const root=document.documentElement;
if(root.dataset.gnr8ThemeReady)return;root.dataset.gnr8ThemeReady='true';
const search=document.querySelector('form[data-gnr8-search]');
if(search){
 const wrapper=search.closest('.search_wrapper'),input=search.querySelector('[name="s"]');
 const toggle=document.getElementById('search_button');
 const show=open=>{if(wrapper){wrapper.style.display=open?'block':'none';toggle?.setAttribute('aria-expanded',String(open));if(open)input.focus()}};
 toggle?.addEventListener('click',e=>{e.preventDefault();show(wrapper?.style.display!=='block')});
 search.querySelector('.icon_close')?.addEventListener('click',e=>{e.preventDefault();show(false)});
 search.addEventListener('keydown',e=>{if(e.key==='Escape'){show(false);toggle?.focus()}});
 search.addEventListener('submit',e=>{
  e.preventDefault();const query=input.value.trim().toLocaleLowerCase();if(!query)return;
  let index;try{index=JSON.parse(document.querySelector('[data-gnr8-search-index]').textContent)}catch{return}
  const dialog=document.createElement('dialog'),heading=document.createElement('h2'),list=document.createElement('ul'),close=document.createElement('button');
  heading.textContent='Rezultati / Results: '+input.value;close.textContent='Zapri / Close';close.type='button';
  for(const page of index){if(!page.text.toLocaleLowerCase().includes(query))continue;const u=new URL(page.path,location.href);if(u.origin!==location.origin)continue;const item=document.createElement('li'),a=document.createElement('a');a.href=u.href;a.textContent=page.title;item.append(a);list.append(item)}
  if(!list.children.length){const item=document.createElement('li');item.textContent='Ni zadetkov / No results';list.append(item)}
  dialog.setAttribute('aria-label','Rezultati iskanja / Search results');dialog.append(heading,list,close);document.body.append(dialog);
  close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();input.focus()},{once:true});dialog.showModal();
 });
}
for(const slider of document.querySelectorAll('[data-gnr8-testimonials]')){
 const slides=[...slider.querySelectorAll('ul.testimonials_slider_ul>li')];let index=0;
 const show=i=>{index=(i+slides.length)%slides.length;slides.forEach((s,j)=>{s.hidden=j!==index;s.style.display=j===index?'block':'none'})};
 for(const [label,offset] of [['Prejšnje / Previous',-1],['Naslednje / Next',1]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>show(index+offset);slider.append(b)}show(0);
}
const top=document.getElementById('Top_bar');
if(top&&document.body.classList.contains('sticky-header')){const update=()=>top.classList.toggle('is-sticky',scrollY>top.offsetHeight+100);addEventListener('scroll',update,{passive:true});update()}
for(const a of document.querySelectorAll('#back_to_top'))a.addEventListener('click',e=>{e.preventDefault();scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})});
for(const el of document.querySelectorAll('[data-anim-type]')){const name=el.getAttribute('data-anim-type');if(!/^[a-zA-Z0-9_-]+$/.test(name))continue;el.style.opacity='1';if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver'in window){const o=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){el.classList.add(name,'animated');o.disconnect()}});o.observe(el)}}
const consent=document.querySelector('[data-gnr8-consent]');
if(consent){
 let accepted=false,chosen=false;try{const s=JSON.parse(localStorage.getItem('gnr8-consent-v1'));if(s&&s.expires>Date.now()){accepted=s.accepted===true;chosen=true}}catch{}
 const full=consent.querySelector('#SCK_MaximizedBanner'),small=consent.querySelector('#SCK_MinimizedBanner');
 const panels=open=>{if(full){full.style.display=open?'block':'none';full.classList.toggle('visible',open)}if(small){small.style.display=open?'none':'block';small.classList.toggle('visible',!open)}};
 const unlock=()=>{
  for(const frame of document.querySelectorAll('iframe[data-gnr8-consent-map]')){const u=new URL(frame.dataset.gnr8ConsentMap);if(u.protocol==='https:'&&u.hostname==='www.google.com'&&u.pathname==='/maps/embed')frame.src=accepted?u.href:'about:blank'}
  if(accepted){for(const config of document.querySelectorAll('[data-gnr8-consent-tag]')){if(config.dataset.loaded)continue;const id=config.dataset.gnr8ConsentTag;if(!/^(?:UA-\d+-\d+|G-[A-Z0-9]+)$/.test(id))continue;config.dataset.loaded='true';window.dataLayer=window.dataLayer||[];const gtag=function(){window.dataLayer.push(arguments)};gtag('js',new Date());gtag('config',id);const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);document.head.append(script)}}
 };
 const choose=value=>{const was=accepted;accepted=value;chosen=true;try{localStorage.setItem('gnr8-consent-v1',JSON.stringify({accepted,expires:Date.now()+365*86400000}))}catch{}panels(false);unlock();if(was&&!value)location.reload()};
 for(const b of consent.querySelectorAll('.SCK_Accept')){b.textContent=b.dataset.textaccept||b.textContent;b.addEventListener('click',()=>choose(true))}
 for(const b of consent.querySelectorAll('.SCK_Close')){b.textContent=b.dataset.textdisable||b.textContent;b.addEventListener('click',e=>{e.preventDefault();choose(false)})}
 for(const b of consent.querySelectorAll('.SCK_Open'))b.addEventListener('click',()=>panels(true));panels(!chosen&&consent.dataset.gnr8Banner!=='disabled');unlock();
}
})();`;
