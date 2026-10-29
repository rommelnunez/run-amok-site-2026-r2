const hero = document.querySelector('.hero');
const menu = document.querySelector('.menu-toggle');
const bar = document.querySelector('.bottom-nav');
const navLinks = [...bar.querySelectorAll('a[href^="#"]')];
const sections = [...document.querySelectorAll('main > section')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function setMenuOpen(open) {
  menu.setAttribute('aria-expanded', String(open));
  bar.dataset.open = String(open);
}
menu.addEventListener('click', () => setMenuOpen(bar.dataset.open !== 'true'));
document.addEventListener('pointerdown', event => { if (!bar.contains(event.target)) setMenuOpen(false); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && bar.dataset.open === 'true') { setMenuOpen(false); menu.focus(); }
});
// Real anchor links supply scrolling, deep links, and browser back/forward.
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
  setMenuOpen(false);
  const target = document.getElementById(link.hash.slice(1));
  if (target) target.focus({preventScroll:true});
}));
function updateNavigation() {
  let current = 'home';
  const threshold = innerHeight * .35;
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) current = section.id;
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = sections.at(-1).id;
  document.body.dataset.section = current;
  navLinks.forEach(link => {
    if (link.hash === '#'+current) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
}
const revealTrigger = document.querySelector('.reveal-trigger');
const trailerControls = document.querySelector('.trailer-controls');
const trailerClose = document.querySelector('.trailer-close');
const siteBrand = document.querySelector('.site-brand');
let pointerFrame = 0;
function canReveal() { return hero.dataset.reveal !== 'open'; }
function cancelRevealHover() {
  cancelAnimationFrame(pointerFrame);
  if (canReveal()) hero.dataset.reveal = '';
}
hero.addEventListener('pointermove', event => {
  if (!canReveal() || event.pointerType === 'touch' || matchMedia('(max-width:700px)').matches) return;
  if (event.target.closest('a')) { cancelRevealHover(); return; }
  cancelAnimationFrame(pointerFrame);
  const {clientX,clientY} = event;
  pointerFrame = requestAnimationFrame(() => {
    if (!canReveal()) return;
    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty('--pointer-x', `${clientX-bounds.left}px`);
    hero.style.setProperty('--pointer-y', `${clientY-bounds.top}px`);
    hero.dataset.reveal = 'hover';
  });
});
hero.addEventListener('pointerleave',cancelRevealHover);
window.addEventListener('resize',()=>{
  if (!canReveal()) return;
  hero.style.removeProperty('--pointer-x');
  hero.style.removeProperty('--pointer-y');
  cancelRevealHover();
});
bar.addEventListener('pointerenter',cancelRevealHover);
function closeTrailer(restoreFocus=true) {
  hero.dataset.reveal = '';
  trailerControls.hidden = true;
  trailerControls.removeAttribute('aria-modal');
  bar.inert = siteBrand.inert = false;
  sections.filter(section=>section!==hero).forEach(section=>section.inert=false);
  if (restoreFocus) revealTrigger.focus({preventScroll:true});
}
revealTrigger.addEventListener('click', () => {
  if (!canReveal()) return;
  cancelAnimationFrame(pointerFrame);
  hero.dataset.reveal = 'open';
  trailerControls.hidden = false;
  trailerControls.setAttribute('role','dialog');
  trailerControls.setAttribute('aria-modal','true');
  bar.inert = siteBrand.inert = true;
  sections.filter(section=>section!==hero).forEach(section=>section.inert=true);
  trailerClose.focus({preventScroll:true});
});
trailerClose.addEventListener('click',()=>closeTrailer());
document.addEventListener('keydown',event=>{
  if (hero.dataset.reveal !== 'open') return;
  if (event.key === 'Escape') closeTrailer();
  if (event.key === 'Tab') { event.preventDefault(); trailerClose.focus(); }
});
// Touch users tap to open; swiping vertically over the portal still scrolls the page.
// Deliberately fictional screening data; replace this array when bookings are confirmed.
const screeningData = [
  { day: 6, city: 'New York', venue: 'Downtown Cinema', time: '10:45 AM ET', special: false },
  { day: 6, city: 'New York', venue: 'Downtown Cinema', time: '2:30 PM ET', special: true },
  { day: 6, city: 'New York', venue: 'Downtown Cinema', time: '9:45 PM ET', special: false },
  { day: 6, city: 'Los Angeles', venue: 'Sunset Picture House', time: '11:00 AM PT', special: false },
  { day: 6, city: 'Los Angeles', venue: 'Sunset Picture House', time: '3:15 PM PT', special: true },
  { day: 6, city: 'New York', venue: 'Downtown Cinema', time: '7:00 PM ET', special: true },
  { day: 6, city: 'Los Angeles', venue: 'Sunset Picture House', time: '7:30 PM PT', special: false },
  { day: 7, city: 'Chicago', venue: 'Lakeside Cinema', time: '6:00 PM CT', special: true },
  { day: 8, city: 'New York', venue: 'Downtown Cinema', time: '4:00 PM ET', special: false },
  { day: 10, city: 'Los Angeles', venue: 'Sunset Picture House', time: '8:00 PM PT', special: true },
  { day: 12, city: 'Chicago', venue: 'Lakeside Cinema', time: '7:00 PM CT', special: false },
  { day: 13, city: 'New York', venue: 'Downtown Cinema', time: '7:30 PM ET', special: true },
  { day: 15, city: 'Los Angeles', venue: 'Sunset Picture House', time: '5:00 PM PT', special: false },
  { day: 18, city: 'Chicago', venue: 'Lakeside Cinema', time: '7:00 PM CT', special: true }
];
let screeningWeek = 0;
let screeningDay = 6;
let specialOnly = false;
const cityFilter = document.querySelector('#screening-city');
const specialFilter = document.querySelector('#screening-special');
function showtimeMinutes(time) {
  const [, hour, minute, period] = time.match(/(\d+):(\d+) (AM|PM)/);
  return (Number(hour) % 12 + (period === 'PM' ? 12 : 0)) * 60 + Number(minute);
}
function groupScreenings(items) {
  const venues = new Map();
  items.forEach(item => {
    const key = `${item.city}::${item.venue}`;
    if (!venues.has(key)) venues.set(key, { city: item.city, venue: item.venue, shows: [] });
    venues.get(key).shows.push(item);
  });
  return [...venues.values()].map(group => ({ ...group, shows: group.shows.sort((a,b) => showtimeMinutes(a.time) - showtimeMinutes(b.time)) }));
}
function renderScreenings() {
  const start = 6 + screeningWeek * 7;
  document.querySelector('#screening-dates').innerHTML = Array.from({length:7}, (_,index) => {
    const day = start + index;
    const weekday = new Date(2026,10,day).toLocaleDateString('en-US',{weekday:'short'});
    return `<button type="button" data-day="${day}" aria-pressed="${day===screeningDay}" aria-label="${weekday}, November ${day}, 2026"><span>${weekday}</span><strong>${day}</strong></button>`;
  }).join('');
  document.querySelector('#week-prev').disabled = screeningWeek === 0;
  document.querySelector('#week-next').disabled = screeningWeek === 1;
  const matches = screeningData.filter(item => item.day === screeningDay && (cityFilter.value === 'all' || item.city === cityFilter.value) && (!specialOnly || item.special));
  document.querySelector('#screening-results').innerHTML = matches.length ? groupScreenings(matches).map(group => `<article class="screening-theater"><h3>${group.venue}</h3><p class="theater-location">${group.city}</p><ul class="showtime-list">${group.shows.map(item => `<li><span class="showtime-chip" title="Tickets not yet available"><time>${item.time.replace(/ (ET|PT|CT)$/, '').toLowerCase()}</time>${item.special ? '<span class="screening-tag">Q&amp;A</span>' : ''}</span></li>`).join('')}</ul></article>`).join('') : '<p class="screening-empty">No screenings found. Try another date or location.</p>';
}
document.querySelector('#screening-dates').addEventListener('click', event => {
  const button = event.target.closest('[data-day]');
  if (!button) return;
  screeningDay = Number(button.dataset.day);
  renderScreenings();
  document.querySelector(`[data-day="${screeningDay}"]`).focus({preventScroll:true});
});
document.querySelector('#week-prev').addEventListener('click', () => { screeningWeek = 0; screeningDay = 6; renderScreenings(); });
document.querySelector('#week-next').addEventListener('click', () => { screeningWeek = 1; screeningDay = 13; renderScreenings(); });
cityFilter.addEventListener('change', renderScreenings);
specialFilter.addEventListener('click', () => { specialOnly = !specialOnly; specialFilter.setAttribute('aria-pressed',String(specialOnly)); renderScreenings(); });
renderScreenings();

// Connect a subscription endpoint before enabling signup; never simulate success.
document.querySelector('#newsletter-form').addEventListener('submit', event => {
  event.preventDefault();
  document.querySelector('#newsletter-status').textContent = 'Signups are not open yet. Your email has not been submitted.';
});

// Native scrolling is never intercepted. CSS owns the wheel geometry.
const castTrack = document.querySelector('.cast-scroll-track');
const castStage = document.querySelector('.cast-stage');
const castCopies = [...document.querySelectorAll('.cast-copy')];
const castPortraits = [...document.querySelectorAll('.cast-portrait')];
let castIndex = 0;
let castFrame = 0;
function castStepSize() { return (castTrack.offsetHeight - castStage.offsetHeight) / (castCopies.length - 1); }
function updateCastWheel() {
  const progress = Math.max(0,Math.min(castCopies.length-1,(parseFloat(getComputedStyle(castStage).top) - castTrack.getBoundingClientRect().top) / castStepSize()));
  castStage.style.setProperty('--cast-progress', progress);
  castIndex = Math.round(progress);
  castCopies.forEach((copy,i) => { const active=i===castIndex; copy.dataset.active=String(active); copy.inert=!active; copy.setAttribute('aria-hidden',String(!active)); });
  castPortraits.forEach((portrait,i) => { portrait.dataset.distant=String(Math.abs(i-progress)>1.8); portrait.dataset.current=String(i===castIndex); });
}
function jumpCast(index) {
  const target=Math.max(0,Math.min(castCopies.length-1,index));
  const top=window.scrollY+castTrack.getBoundingClientRect().top-parseFloat(getComputedStyle(castStage).top)+target*castStepSize();
  window.scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
window.addEventListener('scroll',()=> { cancelAnimationFrame(castFrame); castFrame=requestAnimationFrame(updateCastWheel); },{passive:true});
window.addEventListener('resize',updateCastWheel);
castPortraits.forEach((portrait,i)=>portrait.addEventListener('click',()=>jumpCast(i)));

// Gallery records: add event albums here when event photography is supplied.
const extrasAlbums = {"poster": {"title": "Poster artwork", "items": [{"src": "assets/poster-artwork.png", "alt": "Run Amok poster artwork", "credit": "", "source": ""}]}, "sundance": {"title": "Sundance, 2026", "items": [{"src": "assets/portraits/alyssa-marvin-web.jpg", "alt": "Alyssa Marvin at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Alyssa_Marvin_at_Sundance_Film_Festival_2026-1.jpg"}, {"src": "assets/portraits/patrick-wilson-web.jpg", "alt": "Patrick Wilson at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Patrick_Wilson_at_Sundance_Film_Festival_2026-3_%28cropped%29.jpg"}, {"src": "assets/portraits/margaret-cho-web.jpg", "alt": "Margaret Cho at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Margaret_Cho_at_Sundance_Film_Festival_2026-2_%28cropped%29.jpg"}, {"src": "assets/portraits/sophia-torres-web.jpg", "alt": "Sophia Torres at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Sophia_Torres_at_Sundance_Film_Festival_2026-6.jpg"}, {"src": "assets/portraits/molly-ringwald-web.jpg", "alt": "Molly Ringwald at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Molly_Ringwald_at_Sundance_Film_Festival_2026-1.jpg"}, {"src": "assets/portraits/julie-christeas-web.jpg", "alt": "Julie Christeas at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Julie_Christeas_at_Sundance_Film_Festival_2026-1.jpg"}]}};

// Keep gallery state separate from navigation; new events can use the same record shape.
extrasAlbums.teaser = {title:'Teaser', items:[{src:'assets/hero.png', alt:'Run Amok teaser', credit:'', source:''}]};
extrasAlbums.bts = {title:'Behind the scenes', items:[]};
const galleryStage = document.querySelector('.gallery-stage');
const galleryImage = document.querySelector('.gallery-image');
const galleryThumbs = document.querySelector('.gallery-thumbnails');
let collection = 'sundance';
let galleryIndex = 0;
function renderGallery() {
  extrasAlbums.poster.items[0].src = 'assets/poster1.png';
  const album=extrasAlbums[collection], item=album.items[galleryIndex];
  galleryImage.hidden=!item;
  const empty=document.querySelector('.gallery-empty'); empty.hidden=!!item; empty.textContent='Behind-the-scenes photos coming soon.';
  document.querySelector('.gallery-video-status').hidden=collection!=='teaser';
  const caption=document.querySelector('.gallery-caption');caption.replaceChildren();
  if(item) {
    galleryImage.classList.remove('is-changing'); galleryImage.src=item.src;galleryImage.alt=item.alt;
    void galleryImage.offsetWidth; galleryImage.classList.add('is-changing');
    if(collection==='sundance')caption.append(document.createTextNode(item.alt.replace(' at Sundance 2026','')));
    if(item.source) { const link=document.createElement('a');link.href=item.source;link.target='_blank';link.rel='noopener';link.textContent=item.credit;caption.append(link); }
  }
  galleryThumbs.replaceChildren();
  album.items.forEach((photo,index)=>{
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',photo.alt);button.setAttribute('aria-pressed',String(index===galleryIndex));
    const img=document.createElement('img');img.src=photo.src;img.alt='';button.append(img);
    button.addEventListener('click',()=>{galleryIndex=index;renderGallery();galleryThumbs.children[index].focus({preventScroll:true});});galleryThumbs.append(button);
  });
  document.querySelectorAll('[data-collection]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.collection===collection)));
  const prev=document.querySelector('.gallery-prev'), next=document.querySelector('.gallery-next');
  prev.hidden=next.hidden=album.items.length<2;prev.disabled=galleryIndex===0;next.disabled=galleryIndex===album.items.length-1;
}
function moveGallery(direction) {
  galleryIndex=Math.max(0,Math.min(extrasAlbums[collection].items.length-1,galleryIndex+direction));renderGallery();
}
document.querySelector('.gallery-prev').addEventListener('click',()=>moveGallery(-1));
document.querySelector('.gallery-next').addEventListener('click',()=>moveGallery(1));
galleryStage.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();moveGallery(event.key==='ArrowLeft'?-1:1);}});

let galleryTouch = null;
galleryStage.addEventListener('touchstart', event => {
  galleryTouch = {x:event.touches[0].clientX,y:event.touches[0].clientY};
},{passive:true});
galleryStage.addEventListener('touchend', event => {
  if (galleryTouch) {
    const dx=event.changedTouches[0].clientX-galleryTouch.x,dy=event.changedTouches[0].clientY-galleryTouch.y;
    if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)) moveGallery(dx<0?1:-1);
  }
  galleryTouch=null;
},{passive:true});
galleryStage.addEventListener('touchcancel',()=>galleryTouch=null,{passive:true});
document.querySelectorAll('[data-collection]').forEach(button=>button.addEventListener('click',()=>{
  collection=button.dataset.collection;galleryIndex=0;renderGallery();
}));
renderGallery();

let navigationFrame=0;
window.addEventListener('scroll',()=>{
  cancelAnimationFrame(navigationFrame);
  navigationFrame=requestAnimationFrame(updateNavigation);
},{passive:true});
window.addEventListener('resize',updateNavigation);
window.addEventListener('pageshow',()=>{updateNavigation();updateCastWheel();});
updateNavigation();updateCastWheel();
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const quoteObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting) { entry.target.dataset.visible='true'; quoteObserver.unobserve(entry.target); }
    });
  },{threshold:.12});
  document.querySelectorAll('.press-quote').forEach(quote=>{quote.dataset.animate='true';quoteObserver.observe(quote);});
}
