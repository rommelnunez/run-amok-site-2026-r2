const hero = document.querySelector('.hero');
const menu = document.querySelector('.menu-toggle');
const bar = document.querySelector('.bottom-nav');
const navLinks = [...bar.querySelectorAll('a[href^="#"]')];
const sections = [...document.querySelectorAll('main > section')];
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
// Keep anchors in browser history and account for the fixed header.
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const id = link.hash.slice(1);
  const target = document.getElementById(id === 'notify' ? 'more' : id);
  if (!target) return;
  event.preventDefault();
  setMenuOpen(false);
  const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
  const top = Math.max(0, scrollY + target.getBoundingClientRect().top - headerHeight);
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  if (id === 'notify') {
    setEnvelopeMode('address');
    centerEnvelope();
    return;
  }
  if (id === 'more') setEnvelopeMode('photos', false);
  target.focus({preventScroll:true});
  window.scrollTo({top, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}));
function readCurrentSection() {
  let current = 'home';
  const threshold = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) + 55;
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) current = section.id;
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = sections.at(-1).id;
  if (current === 'film') return 'cast';
  if (current === 'more' && btsStage.dataset.mode !== 'photos') return 'notify';
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
const siteBrand = document.querySelector('.site-brand');
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
  bar.inert = siteBrand.inert = false;
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
  bar.inert = siteBrand.inert = true;
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
castRow.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'mouse' || event.button !== 0) return;
  castDrag = {pointer:event.pointerId, x:event.clientX, scroll:castRow.scrollLeft};
  castRow.setPointerCapture(event.pointerId);
  castRow.dataset.dragging = 'true';
});
castRow.addEventListener('pointermove', event => {
  if (event.pointerId !== castDrag?.pointer) return;
  castRow.scrollLeft = castDrag.scroll + castDrag.x - event.clientX;
});
castRow.addEventListener('lostpointercapture', () => {
  castDrag = undefined;
  delete castRow.dataset.dragging;
});
castRow.addEventListener('dragstart', event => event.preventDefault());

// Duplicate visual cards to close the loop without reading the reviews twice.
const pressWindow = document.querySelector('#press-reviews');
const pressTrack = pressWindow.querySelector('.press-track');
const reviews = [...pressTrack.children];
const pressCopies = reviews.map(review => {
  const copy = review.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  pressTrack.append(copy);
  return copy;
});
let pressVisible = false;
let pressHovered = false;
let pressTouching = false;
let pressTouchTimer;
let pressFrame = 0;
let pressTime = 0;
let pressPosition = 0;
let pressLastWrite = 0;
function pressLoopWidth() { return pressCopies[0].offsetLeft - reviews[0].offsetLeft; }
function animatePress(time) {
  pressFrame = 0;
  if (reducedMotion.matches || !pressVisible || pressHovered || pressTouching || pressWindow.matches(':focus-within') || document.hidden) {
    pressTime = 0;
    return;
  }
  if (Math.abs(pressWindow.scrollLeft - pressLastWrite) > 1) pressPosition = pressWindow.scrollLeft;
  pressPosition = (pressPosition + Math.min(time - (pressTime || time), 40) * .038) % pressLoopWidth();
  pressTime = time;
  pressWindow.scrollLeft = pressPosition;
  pressLastWrite = pressWindow.scrollLeft;
  pressFrame = requestAnimationFrame(animatePress);
}
function schedulePress() {
  if (!pressFrame) pressFrame = requestAnimationFrame(animatePress);
}
new IntersectionObserver(([entry]) => {
  pressVisible = entry.isIntersecting;
  schedulePress();
}).observe(pressWindow);
pressWindow.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') pressHovered = true; });
pressWindow.addEventListener('pointerleave', () => { pressHovered = false; schedulePress(); });
pressWindow.addEventListener('focusout', schedulePress);
pressWindow.addEventListener('touchstart', () => {
  clearTimeout(pressTouchTimer);
  pressTouching = true;
}, {passive:true});
function resumePressAfterTouch(event) {
  if (event.touches.length) return;
  pressTouchTimer = setTimeout(() => {
    pressTouching = false;
    schedulePress();
  }, 1500);
}
pressWindow.addEventListener('touchend', resumePressAfterTouch, {passive:true});
pressWindow.addEventListener('touchcancel', resumePressAfterTouch, {passive:true});
document.addEventListener('visibilitychange', schedulePress);

const btsStage = document.querySelector('.bts-stage');
const photoStack = document.querySelector('.photo-stack');
const envelope = document.querySelector('#notify');
const openEnvelope = document.querySelector('#envelope-open');
const closeEnvelope = document.querySelector('#envelope-close');
const newsletterForm = document.querySelector('#newsletter-form');
const newsletterEmail = document.querySelector('#newsletter-email');
const newsletterStatus = document.querySelector('#newsletter-status');
function setEnvelopeMode(mode, focus = true) {
  btsStage.dataset.mode = mode;
  const showingPhotos = mode === 'photos';
  photoStack.inert = !showingPhotos;
  openEnvelope.hidden = !showingPhotos;
  openEnvelope.setAttribute('aria-expanded', String(!showingPhotos));
  closeEnvelope.hidden = showingPhotos;
  newsletterForm.hidden = mode !== 'address';
  if (mode !== 'sent') newsletterStatus.replaceChildren();
  if (focus) {
    if (mode === 'address') newsletterEmail.focus({preventScroll:true});
    else if (showingPhotos) openEnvelope.focus({preventScroll:true});
    else closeEnvelope.focus({preventScroll:true});
  }
  scheduleScrollUpdate();
}
function centerEnvelope(behavior = reducedMotion.matches ? 'instant' : 'smooth') {
  const stage = btsStage.getBoundingClientRect();
  window.scrollTo({top: scrollY + stage.top + stage.height * .49 - innerHeight * .49, behavior});
}
openEnvelope.addEventListener('click', () => {
  setEnvelopeMode('address');
  centerEnvelope();
});
closeEnvelope.addEventListener('click', () => {
  if (location.hash === '#notify') history.replaceState(null, '', '#more');
  setEnvelopeMode('photos');
});
envelope.addEventListener('keydown', event => {
  if (event.key === 'Escape' && btsStage.dataset.mode !== 'photos') closeEnvelope.click();
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
    if (btsStage.dataset.mode === 'photos') setEnvelopeMode('address', false);
    centerEnvelope('instant');
  } else if (location.hash === '#more') setEnvelopeMode('photos', false);
}
window.addEventListener('hashchange', restoreEnvelopeFromHash);
if (location.hash === '#notify') requestAnimationFrame(restoreEnvelopeFromHash);

// Import Three.js only once the photo section approaches the viewport.
const photoObserver = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) return;
  photoObserver.disconnect();
  import('./photo-stack.js?v=r2-film-layout-1')
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
  schedulePress();
  scheduleScrollUpdate();
});
scheduleScrollUpdate();
