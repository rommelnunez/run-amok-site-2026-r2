const hero = document.querySelector('.hero');
const menu = document.querySelector('.menu-toggle');
const bar = document.querySelector('.bottom-nav');
const navLinks = [...bar.querySelectorAll('a[href^="#"]')];
const sections = [...document.querySelectorAll('main > section:not([hidden])')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const compactNavigation = matchMedia('(max-width: 960px)');
const bottomLinks = bar.querySelector('.bottom-links');
function setMenuOpen(open) {
  menu.setAttribute('aria-expanded', String(open));
  bar.dataset.open = String(open);
  bottomLinks.inert = compactNavigation.matches && !open;
}
compactNavigation.addEventListener('change', () => setMenuOpen(false));
setMenuOpen(false);
menu.addEventListener('click', () => setMenuOpen(bar.dataset.open !== 'true'));
document.addEventListener('pointerdown', event => { if (!bar.contains(event.target)) setMenuOpen(false); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && bar.dataset.open === 'true') { setMenuOpen(false); menu.focus(); }
});
// Keep anchors in browser history and scroll directly to each section.
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const id = link.hash.slice(1);
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  setMenuOpen(false);
  const top = Math.max(0, scrollY + target.getBoundingClientRect().top);
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  if (id === 'notify') {
    setEnvelopeMode('address');
    centerEnvelope();
    return;
  }
  if (id === 'more') setEnvelopeMode('closed', false);
  target.focus({preventScroll:true});
  window.scrollTo({top, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}));
function readCurrentSection() {
  let current = 'home';
  const threshold = 55;
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) current = section.id;
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = sections.at(-1).id;
  if (current === 'film') return 'cast';
  return current;
}
function updateNavigation(current) {
  if (document.body.dataset.section === current) return;
  document.body.dataset.section = current;
  navLinks.forEach(link => {
    if (link.hash === '#'+current) link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  });
}
const revealTrigger = document.querySelector('.reveal-trigger');
const trailerControls = document.querySelector('.trailer-controls');
const trailerClose = document.querySelector('.trailer-close');
const trailerReveal = document.querySelector('.trailer-reveal');
const hoverPointer = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 701px)');
let pointerFrame = 0;
let pointerPosition = null;
let pointerTarget = null;
let pointerTime = 0;
let portalFrame = 0;
let closeTimer = 0;
let revealDrag = null;
let suppressRevealClick = false;
function canReveal() { return !['opening', 'open', 'closing'].includes(hero.dataset.reveal); }
function cancelRevealHover() {
  cancelAnimationFrame(pointerFrame);
  pointerFrame = 0;
  pointerPosition = pointerTarget = null;
  if (canReveal()) hero.dataset.reveal = '';
}
function followPointer(time) {
  pointerFrame = 0;
  if (!canReveal() || !pointerTarget) return;
  const blend = 1 - Math.exp(-Math.min(time - pointerTime || 16, 48) / 55);
  pointerTime = time;
  pointerPosition.x += (pointerTarget.x - pointerPosition.x) * blend;
  pointerPosition.y += (pointerTarget.y - pointerPosition.y) * blend;
  const moving = Math.hypot(pointerTarget.x - pointerPosition.x, pointerTarget.y - pointerPosition.y) > .15;
  if (!moving) pointerPosition = {...pointerTarget};
  hero.style.setProperty('--pointer-x', `${pointerPosition.x}px`);
  hero.style.setProperty('--pointer-y', `${pointerPosition.y}px`);
  if (hero.dataset.reveal !== 'hover') hero.dataset.reveal = 'hover';
  if (moving) pointerFrame = requestAnimationFrame(followPointer);
}
hero.addEventListener('pointermove', event => {
  if (revealDrag || !canReveal() || event.pointerType === 'touch' || !hoverPointer.matches || reducedMotion.matches) return;
  if (event.target.closest('a')) { cancelRevealHover(); return; }
  const bounds = hero.getBoundingClientRect();
  pointerTarget = {x: event.clientX - bounds.left, y: event.clientY - bounds.top};
  if (!pointerPosition) { pointerPosition = {...pointerTarget}; pointerTime = performance.now(); }
  if (!pointerFrame) pointerFrame = requestAnimationFrame(followPointer);
});
hero.addEventListener('pointerleave',()=>{ if (!revealDrag) cancelRevealHover(); });
window.addEventListener('resize',()=>{
  if (!canReveal()) return;
  hero.style.removeProperty('--pointer-x');
  hero.style.removeProperty('--pointer-y');
  cancelRevealHover();
});
bar.addEventListener('pointerenter',cancelRevealHover);
function finishClosingTrailer() {
  if (hero.dataset.reveal !== 'closing') return;
  clearTimeout(closeTimer);
  hero.dataset.reveal = '';
  trailerControls.hidden = true;
  trailerControls.removeAttribute('aria-modal');
  bar.inert = false;
  sections.filter(section=>section!==hero).forEach(section=>section.inert=false);
  revealTrigger.focus({preventScroll:true});
}
function closeTrailer() {
  if (canReveal() || hero.dataset.reveal === 'closing') return;
  const wasOpening = hero.dataset.reveal === 'opening';
  cancelAnimationFrame(portalFrame);
  hero.dataset.reveal = 'closing';
  if (reducedMotion.matches || wasOpening) finishClosingTrailer();
  else closeTimer = setTimeout(finishClosingTrailer, 700);
}
trailerReveal.addEventListener('transitionend', event => {
  if (event.target === trailerReveal && event.propertyName === 'clip-path') finishClosingTrailer();
});
// Capture only gestures that begin on the circle; the rest of the page scrolls normally.
revealTrigger.addEventListener('pointerdown', event => {
  if (!canReveal() || !event.isPrimary || event.button !== 0) return;
  if (event.pointerType === 'mouse' && hoverPointer.matches) return;
  suppressRevealClick = false;
  cancelRevealHover();
  const bounds = hero.getBoundingClientRect();
  const target = revealTrigger.getBoundingClientRect();
  revealDrag = {id:event.pointerId, startX:event.clientX, startY:event.clientY,
    x:target.left + target.width / 2 - bounds.left,
    y:target.top + target.height / 2 - bounds.top, moved:false};
  revealTrigger.setPointerCapture(event.pointerId);
});
revealTrigger.addEventListener('pointermove', event => {
  if (!revealDrag || event.pointerId !== revealDrag.id) return;
  const dx = event.clientX - revealDrag.startX, dy = event.clientY - revealDrag.startY;
  if (!revealDrag.moved && Math.hypot(dx,dy) < 8) return;
  revealDrag.moved = true;
  hero.dataset.dragging = 'true';
  const bounds = hero.getBoundingClientRect();
  const radius = revealTrigger.getBoundingClientRect().width / 2;
  const x = Math.max(radius,Math.min(bounds.width-radius,revealDrag.x+dx));
  const y = Math.max(radius,Math.min(bounds.height-radius,revealDrag.y+dy));
  hero.style.setProperty('--pointer-x', `${x}px`);
  hero.style.setProperty('--pointer-y', `${y}px`);
});
function endRevealDrag(event) {
  if (!revealDrag || (event && event.pointerId !== revealDrag.id)) return;
  const {id,moved} = revealDrag;
  suppressRevealClick = moved || event?.type === 'pointercancel';
  revealDrag = null;
  delete hero.dataset.dragging;
  if (revealTrigger.hasPointerCapture(id)) revealTrigger.releasePointerCapture(id);
}
revealTrigger.addEventListener('pointerup',endRevealDrag);
revealTrigger.addEventListener('pointercancel',endRevealDrag);
revealTrigger.addEventListener('lostpointercapture',endRevealDrag);
window.addEventListener('resize',()=>endRevealDrag());
revealTrigger.addEventListener('dragstart',event=>event.preventDefault());
revealTrigger.addEventListener('click', event => {
  if (suppressRevealClick && event.detail !== 0) {
    suppressRevealClick = false;
    event.preventDefault();
    return;
  }
  suppressRevealClick = false;
  if (!canReveal()) return;
  cancelAnimationFrame(pointerFrame);
  pointerFrame = 0;
  const origin = revealTrigger.getBoundingClientRect();
  hero.style.setProperty('--portal-x', `${origin.left + origin.width / 2}px`);
  hero.style.setProperty('--portal-y', `${origin.top + origin.height / 2}px`);
  hero.dataset.reveal = reducedMotion.matches ? 'open' : 'opening';
  trailerControls.hidden = false;
  trailerControls.setAttribute('role','dialog');
  trailerControls.setAttribute('aria-modal','true');
  bar.inert = true;
  sections.filter(section=>section!==hero).forEach(section=>section.inert=true);
  trailerClose.focus({preventScroll:true});
  if (!reducedMotion.matches) portalFrame = requestAnimationFrame(() => {
    portalFrame = requestAnimationFrame(() => { if (hero.dataset.reveal === 'opening') hero.dataset.reveal = 'open'; });
  });
});
trailerClose.addEventListener('click',()=>closeTrailer());
document.addEventListener('keydown',event=>{
  if (canReveal()) return;
  if (event.key === 'Escape') closeTrailer();
  if (event.key === 'Tab') { event.preventDefault(); trailerClose.focus(); }
});
// Tap opens the trailer; dragging the circle repositions it without opening it.
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
function screeningResultsMarkup(matches) {
  return matches.length ? groupScreenings(matches).map(group => `<article class="screening-theater"><h3>${group.venue}</h3><p class="theater-location">${group.city}</p><ul class="showtime-list">${group.shows.map(item => `<li><span class="showtime-chip" title="Tickets not yet available"><time>${item.time.replace(/ (ET|PT|CT)$/, '').toLowerCase()}</time>${item.special ? '<span class="screening-tag">Q&amp;A</span>' : ''}</span></li>`).join('')}</ul></article>`).join('') : '<p class="screening-empty">No screenings found. Try another date or location.</p>';
}
// Intrinsic sizing keeps all dates/filters at the tallest day's natural height.
// CSS lays these non-interactive guides over one another, including on mobile.
const screeningSizeGuide = document.querySelector('.screening-size-guide');
[...new Set(screeningData.map(item => item.day))].forEach(day => {
  const guide = document.createElement('div');
  guide.innerHTML = screeningResultsMarkup(screeningData.filter(item => item.day === day));
  screeningSizeGuide.append(guide);
});
const screeningDates = document.querySelector('#screening-dates');
let renderedScreeningWeek = -1;
function renderScreenings() {
  const start = 6 + screeningWeek * 7;
  if (renderedScreeningWeek !== screeningWeek) {
    screeningDates.innerHTML = Array.from({length:7}, (_,index) => {
      const day = start + index;
      const weekday = new Date(2026,10,day).toLocaleDateString('en-US',{weekday:'short'});
      return `<button type="button" data-day="${day}" aria-pressed="false" aria-label="${weekday}, November ${day}, 2026"><span>${weekday}</span><strong>${day}</strong></button>`;
    }).join('');
    renderedScreeningWeek = screeningWeek;
  }
  screeningDates.querySelectorAll('button').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.day) === screeningDay));
  });
  document.querySelector('#week-prev').disabled = screeningWeek === 0;
  document.querySelector('#week-next').disabled = screeningWeek === 1;
  const matches = screeningData.filter(item => item.day === screeningDay && (cityFilter.value === 'all' || item.city === cityFilter.value) && (!specialOnly || item.special));
  document.querySelector('#screening-results').innerHTML = screeningResultsMarkup(matches);
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

// Let a desktop mouse drag the cast row while touch and keyboard scrolling stay native.
const castRow = document.querySelector('#cast-row');
let castDrag;
let suppressCastClick = false;
castRow.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  castDrag = {pointer:event.pointerId, x:event.clientX, y:event.clientY, scroll:castRow.scrollLeft, dragging:false};
});
castRow.addEventListener('pointermove', event => {
  if (event.pointerId !== castDrag?.pointer) return;
  const deltaX = castDrag.x - event.clientX;
  const deltaY = castDrag.y - event.clientY;
  if (!castDrag.dragging && Math.abs(deltaX) > 6 && Math.abs(deltaX) > Math.abs(deltaY)) {
    castDrag.dragging = true;
    castRow.setPointerCapture(event.pointerId);
    castRow.dataset.dragging = 'true';
  }
  if (!castDrag.dragging) return;
  castRow.scrollLeft = castDrag.scroll + deltaX;
});
castRow.addEventListener('pointerup', event => {
  if (event.pointerId !== castDrag?.pointer) return;
  if (castDrag.dragging) {
    suppressCastClick = true;
    delete castRow.dataset.dragging;
    setTimeout(() => { suppressCastClick = false; }, 0);
    castRow.releasePointerCapture(event.pointerId);
  }
  castDrag = undefined;
});
castRow.addEventListener('pointercancel', () => {
  castDrag = undefined;
  delete castRow.dataset.dragging;
});
castRow.addEventListener('lostpointercapture', () => { delete castRow.dataset.dragging; });
castRow.addEventListener('click', event => {
  if (suppressCastClick) { event.preventDefault(); event.stopPropagation(); return; }
  const button = event.target.closest('.cast-person button');
  if (!button) return;
  const nextPressed = button.getAttribute('aria-pressed') !== 'true';
  castRow.querySelectorAll('.cast-person button').forEach(person => person.setAttribute('aria-pressed', 'false'));
  button.setAttribute('aria-pressed', String(nextPressed));
});
castRow.addEventListener('dragstart', event => event.preventDefault());
// On phones, vertical page scrolling pans the pinned cast stage. Scrolling stays native.
const castSection = document.querySelector('#cast');
const castScrollLinked = matchMedia('(max-width: 700px) and (prefers-reduced-motion: no-preference)');
function syncCastScrollLink() {
  castSection.dataset.scrollLinked = String(castScrollLinked.matches);
  updateCastPan();
}
function updateCastPan() {
  if (!castScrollLinked.matches) return;
  const box = castSection.getBoundingClientRect();
  const travel = box.height - innerHeight;
  const progress = travel > 0 ? Math.min(1, Math.max(0, -box.top / travel)) : 0;
  castRow.scrollLeft = progress * (castRow.scrollWidth - castRow.clientWidth);
}
castScrollLinked.addEventListener('change', syncCastScrollLink);
syncCastScrollLink();

const photoStack = document.querySelector('.photo-stack');
const notifySection = document.querySelector('.notify-section');
const envelope = notifySection.querySelector('.envelope');
const openEnvelope = document.querySelector('#envelope-open');
const closeEnvelope = document.querySelector('#envelope-close');
const newsletterForm = document.querySelector('#newsletter-form');
const newsletterEmail = document.querySelector('#newsletter-email');
const newsletterStatus = document.querySelector('#newsletter-status');
function setEnvelopeMode(mode, focus = true) {
  notifySection.dataset.mode = mode;
  const isClosed = mode === 'closed';
  openEnvelope.hidden = !isClosed;
  openEnvelope.setAttribute('aria-expanded', String(!isClosed));
  closeEnvelope.hidden = isClosed;
  newsletterForm.hidden = mode !== 'address';
  if (mode !== 'sent') newsletterStatus.replaceChildren();
  if (focus) {
    if (mode === 'address') newsletterEmail.focus({preventScroll:true});
    else if (isClosed) openEnvelope.focus({preventScroll:true});
    else closeEnvelope.focus({preventScroll:true});
  }
  scheduleScrollUpdate();
}
function centerEnvelope(behavior = reducedMotion.matches ? 'instant' : 'smooth') {
  const card = envelope.getBoundingClientRect();
  window.scrollTo({top: scrollY + card.top + card.height * .5 - innerHeight * .5, behavior});
}
openEnvelope.addEventListener('click', () => {
  setEnvelopeMode('address');
  centerEnvelope();
});
closeEnvelope.addEventListener('click', () => {
  setEnvelopeMode('closed');
});
envelope.addEventListener('keydown', event => {
  if (event.key === 'Escape' && notifySection.dataset.mode !== 'closed') closeEnvelope.click();
});
newsletterForm.addEventListener('submit', event => {
  event.preventDefault();
  // Local simulation. The address is neither retained nor sent to a service.
  newsletterForm.reset();
  const heading = document.createElement('strong');
  heading.textContent = 'Thanks for signing up!';
  const detail = document.createElement('small');
  detail.textContent = 'This signup was simulated.';
  newsletterStatus.replaceChildren(heading, detail);
  setEnvelopeMode('sent');
});
function restoreEnvelopeFromHash() {
  if (location.hash === '#notify') {
    if (notifySection.dataset.mode === 'closed') setEnvelopeMode('address', false);
    centerEnvelope('instant');
  } else if (location.hash === '#more') setEnvelopeMode('closed', false);
}
window.addEventListener('hashchange', restoreEnvelopeFromHash);
if (location.hash === '#notify') requestAnimationFrame(restoreEnvelopeFromHash);

// Import Three.js only once the photo section approaches the viewport.
const photoObserver = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) return;
  photoObserver.disconnect();
  import('./photo-stack.js?v=r2-press-layout-2')
    .then(({mountPhotoStack}) => mountPhotoStack(photoStack, reducedMotion))
    .catch(error => console.error('Photo stack could not load.', error));
}, {rootMargin:'700px'});
photoObserver.observe(photoStack);

let scrollFrame = 0;
function scheduleScrollUpdate() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    updateNavigation(readCurrentSection());
    updateCastPan();
  });
}
window.addEventListener('scroll', scheduleScrollUpdate, {passive:true});
window.addEventListener('resize', scheduleScrollUpdate);
window.addEventListener('pageshow', scheduleScrollUpdate);
new ResizeObserver(scheduleScrollUpdate).observe(document.querySelector('main'));
reducedMotion.addEventListener('change', () => {
  cancelRevealHover();
  hero.style.removeProperty('--pointer-x');
  hero.style.removeProperty('--pointer-y');
  if (reducedMotion.matches) {
    if (hero.dataset.reveal === 'closing') finishClosingTrailer();
    if (hero.dataset.reveal === 'opening') hero.dataset.reveal = 'open';
  }
  scheduleScrollUpdate();
});
scheduleScrollUpdate();
