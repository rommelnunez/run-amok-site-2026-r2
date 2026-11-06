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
// Keep anchor URLs/history, but use one explicit landing point. Cast opens at
// the first profile without scrubbing through its long sticky track on the way.
document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = document.getElementById(link.hash.slice(1));
  if (!target) return;
  event.preventDefault();
  setMenuOpen(false);
  const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
  const top = Math.max(0, scrollY + target.getBoundingClientRect().top - headerHeight);
  if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  target.focus({preventScroll:true});
  if (target.id === 'cast') snapCast = true;
  window.scrollTo({top, behavior: reducedMotion.matches || target.id === 'cast' ? 'instant' : 'smooth'});
}));
function readCurrentSection() {
  let current = 'home';
  const threshold = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) + 1;
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) current = section.id;
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = sections.at(-1).id;
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
  if (!canReveal() || event.pointerType === 'touch' || !hoverPointer.matches || reducedMotion.matches) return;
  if (event.target.closest('a')) { cancelRevealHover(); return; }
  const bounds = hero.getBoundingClientRect();
  pointerTarget = {x: event.clientX - bounds.left, y: event.clientY - bounds.top};
  if (!pointerPosition) { pointerPosition = {...pointerTarget}; pointerTime = performance.now(); }
  if (!pointerFrame) pointerFrame = requestAnimationFrame(followPointer);
});
hero.addEventListener('pointerleave',cancelRevealHover);
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
revealTrigger.addEventListener('click', () => {
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
let castIndex = -1;
let castProgress = 0;
let castTarget = 0;
let snapCast = true;
let castOnscreen = false;
function castStepSize() { return (castTrack.offsetHeight - castStage.offsetHeight) / (castCopies.length - 1); }
function readCastProgress() {
  const bounds = castTrack.getBoundingClientRect();
  castOnscreen = bounds.top < innerHeight && bounds.bottom > 0;
  return Math.max(0,Math.min(castCopies.length-1,(parseFloat(getComputedStyle(castStage).top) - bounds.top) / Math.max(1,castStepSize())));
}
function updateCastWheel(progress) {
  castStage.style.setProperty('--cast-progress', progress.toFixed(4));
  const nextIndex = Math.round(progress);
  if (nextIndex !== castIndex) {
    const moveFocus = castPortraits.includes(document.activeElement);
    castIndex = nextIndex;
    castCopies.forEach((copy,i) => { const active=i===castIndex; copy.dataset.active=String(active); copy.inert=!active; copy.setAttribute('aria-hidden',String(!active)); });
    castPortraits.forEach((portrait,i) => {
      portrait.dataset.current=String(i===castIndex);
      portrait.tabIndex=i===castIndex ? 0 : -1;
      portrait.setAttribute('aria-pressed',String(i===castIndex));
    });
    if (moveFocus) castPortraits[castIndex].focus({preventScroll:true});
  }
  castPortraits.forEach((portrait,i) => {
    const distant=String(Math.abs(i-progress)>1.8);
    if (portrait.dataset.distant !== distant) portrait.dataset.distant=distant;
  });
}
function jumpCast(index) {
  const target=Math.max(0,Math.min(castCopies.length-1,index));
  const top=window.scrollY+castTrack.getBoundingClientRect().top-parseFloat(getComputedStyle(castStage).top)+target*castStepSize();
  window.scrollTo({top,behavior:reducedMotion.matches?'instant':'smooth'});
}
castPortraits.forEach((portrait,i)=>portrait.addEventListener('click',()=>jumpCast(i)));
castStage.addEventListener('keydown', event => {
  if (!event.target.closest('.cast-portrait') || !['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? castCopies.length - 1 : castIndex + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1);
  jumpCast(next);
});

// Gallery records: add event albums here when event photography is supplied.
const extrasAlbums = {"poster": {"title": "Poster artwork", "items": [{"src": "assets/poster-artwork.png", "alt": "Run Amok poster artwork", "credit": "", "source": ""}]}, "sundance": {"title": "Sundance, 2026", "items": [{"src": "assets/portraits/alyssa-marvin-web.jpg", "alt": "Alyssa Marvin at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Alyssa_Marvin_at_Sundance_Film_Festival_2026-1.jpg"}, {"src": "assets/portraits/patrick-wilson-web.jpg", "alt": "Patrick Wilson at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Patrick_Wilson_at_Sundance_Film_Festival_2026-3_%28cropped%29.jpg"}, {"src": "assets/portraits/margaret-cho-web.jpg", "alt": "Margaret Cho at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Margaret_Cho_at_Sundance_Film_Festival_2026-2_%28cropped%29.jpg"}, {"src": "assets/portraits/sophia-torres-web.jpg", "alt": "Sophia Torres at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Sophia_Torres_at_Sundance_Film_Festival_2026-6.jpg"}, {"src": "assets/portraits/molly-ringwald-web.jpg", "alt": "Molly Ringwald at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Molly_Ringwald_at_Sundance_Film_Festival_2026-1.jpg"}, {"src": "assets/portraits/julie-christeas-web.jpg", "alt": "Julie Christeas at Sundance 2026", "credit": "CaseyJNewell / WikiPortraits / CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Julie_Christeas_at_Sundance_Film_Festival_2026-1.jpg"}]}};

// Keep gallery state separate from navigation; new events can use the same record shape.
extrasAlbums.teaser = {title:'Teaser', items:[{src:'assets/hero.png', alt:'Run Amok teaser', credit:'', source:''}]};
extrasAlbums.bts = {title:'Behind the scenes', items:[]};
extrasAlbums.poster.items[0].src = 'assets/poster1.png';
const galleryStage = document.querySelector('.gallery-stage');
let galleryImage = document.querySelector('.gallery-image');
const galleryThumbs = document.querySelector('.gallery-thumbnails');
const galleryCaption = document.querySelector('.gallery-caption');
const galleryEmpty = document.querySelector('.gallery-empty');
const galleryVideoStatus = document.querySelector('.gallery-video-status');
const galleryPrev = document.querySelector('.gallery-prev');
const galleryNext = document.querySelector('.gallery-next');
const galleryCollections = [...document.querySelectorAll('[data-collection]')];
const galleryLoadStatus = document.createElement('p');
galleryLoadStatus.className = 'gallery-load-status';
galleryLoadStatus.setAttribute('role', 'status');
galleryLoadStatus.hidden = true;
galleryCaption.after(galleryLoadStatus);
let collection = 'sundance';
let galleryIndex = 0;
let galleryThumbCollection = '';
let galleryRequest = 0;
let galleryPendingKey = '';
let galleryShown = {collection: 'sundance', index: 0, key: ''};
function updateGalleryControls() {
  const album = extrasAlbums[collection];
  // Keep the same thumbnail buttons while browsing an album, preserving focus.
  if (galleryThumbCollection !== collection) {
    galleryThumbs.replaceChildren();
    album.items.forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', photo.alt);
      const img = document.createElement('img');
      img.src = photo.src;
      img.alt = '';
      img.decoding = 'async';
      button.append(img);
      button.addEventListener('click', () => {
        galleryIndex = index;
        renderGallery();
      });
      galleryThumbs.append(button);
    });
    galleryThumbCollection = collection;
  }
  [...galleryThumbs.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === galleryIndex)));
  galleryCollections.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.collection === collection)));
  galleryPrev.hidden = galleryNext.hidden = album.items.length < 2;
  galleryPrev.disabled = galleryIndex === 0;
  galleryNext.disabled = galleryIndex >= album.items.length - 1;
}
function updateGalleryCaption(item, albumName) {
  galleryCaption.replaceChildren();
  if (!item) return;
  if (albumName === 'sundance') galleryCaption.append(document.createTextNode(item.alt.replace(' at Sundance 2026', '')));
  if (item.source) {
    const link = document.createElement('a');
    link.href = item.source;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = item.credit;
    galleryCaption.append(link);
  }
}
function removeGalleryOutgoing() {
  galleryStage.querySelectorAll('.gallery-image--outgoing').forEach(image => image.remove());
}
async function decodeGalleryImage(item) {
  const image = new Image();
  image.className = 'gallery-image';
  image.alt = item.alt;
  image.decoding = 'async';
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
  image.src = item.src;
  await loaded;
  if (image.decode) await image.decode();
  return image;
}
async function renderGallery() {
  const albumName = collection;
  const index = galleryIndex;
  const item = extrasAlbums[albumName].items[index];
  const key = `${albumName}:${index}`;
  updateGalleryControls();
  if (key === galleryPendingKey) return;
  const request = ++galleryRequest;
  galleryPendingKey = '';
  galleryLoadStatus.hidden = true;
  if (key === galleryShown.key) {
    galleryStage.removeAttribute('aria-busy');
    return;
  }
  if (!item) {
    removeGalleryOutgoing();
    galleryImage.hidden = true;
    galleryEmpty.textContent = 'Behind-the-scenes photos coming soon.';
    galleryEmpty.hidden = false;
    galleryVideoStatus.hidden = true;
    galleryStage.removeAttribute('aria-busy');
    updateGalleryCaption(null, albumName);
    galleryShown = {collection: albumName, index, key};
    return;
  }
  galleryPendingKey = key;
  galleryStage.setAttribute('aria-busy', 'true');
  try {
    const nextImage = await decodeGalleryImage(item);
    // A slower image request must never replace a more recent selection.
    if (request !== galleryRequest) return;
    const alreadyVisible = !galleryImage.hidden && galleryImage.getAttribute('src') === item.src;
    if (!alreadyVisible) {
      removeGalleryOutgoing();
      const previousImage = galleryImage;
      if (!previousImage.hidden && previousImage.complete && previousImage.naturalWidth && !reducedMotion.matches) {
        previousImage.className = 'gallery-image gallery-image--outgoing is-leaving';
        previousImage.alt = '';
        previousImage.setAttribute('aria-hidden', 'true');
        previousImage.addEventListener('animationend', () => previousImage.remove(), {once: true});
        nextImage.classList.add('is-entering');
        nextImage.addEventListener('animationend', () => nextImage.classList.remove('is-entering'), {once: true});
        galleryStage.insertBefore(nextImage, previousImage);
      } else {
        previousImage.replaceWith(nextImage);
      }
      galleryImage = nextImage;
    }
    galleryImage.hidden = false;
    galleryEmpty.hidden = true;
    galleryVideoStatus.hidden = albumName !== 'teaser';
    updateGalleryCaption(item, albumName);
    galleryShown = {collection: albumName, index, key};
  } catch {
    if (request !== galleryRequest) return;
    // Keep the last usable image and its caption; the failed choice remains retryable.
    collection = galleryShown.collection;
    galleryIndex = galleryShown.index;
    updateGalleryControls();
    galleryLoadStatus.textContent = 'This image couldn’t load. Please try again.';
    galleryLoadStatus.hidden = false;
  } finally {
    if (request === galleryRequest) {
      galleryPendingKey = '';
      galleryStage.removeAttribute('aria-busy');
    }
  }
}
function moveGallery(direction) {
  const next = Math.max(0, Math.min(extrasAlbums[collection].items.length - 1, galleryIndex + direction));
  if (next === galleryIndex) return;
  galleryIndex = next;
  renderGallery();
}
galleryPrev.addEventListener('click',()=>moveGallery(-1));
galleryNext.addEventListener('click',()=>moveGallery(1));
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
galleryCollections.forEach(button=>button.addEventListener('click',()=>{
  collection=button.dataset.collection;galleryIndex=0;renderGallery();
}));
renderGallery();

// One frame reads scroll geometry before changing state. Only the portrait
// coordinate eases toward native scroll; document scrolling stays browser-owned.
let scrollFrame=0;
let scrollDirty=true;
let scrollTime=0;
function updateScroll(time) {
  scrollFrame=0;
  let current;
  if (scrollDirty) {
    current=readCurrentSection();
    castTarget=readCastProgress();
    scrollDirty=false;
  }
  const blend=1-Math.exp(-Math.min(time-scrollTime || 16,48)/65);
  scrollTime=time;
  const next = snapCast || reducedMotion.matches || !castOnscreen ? castTarget : castProgress+(castTarget-castProgress)*blend;
  const settling=Math.abs(castTarget-next)>.0005;
  const progress=settling ? next : castTarget;
  if (current) updateNavigation(current);
  if (progress!==castProgress || castIndex===-1) updateCastWheel(progress);
  castProgress=progress;
  snapCast=false;
  if (settling) scrollFrame=requestAnimationFrame(updateScroll);
}
function scheduleScrollUpdate() {
  scrollDirty=true;
  if (!scrollFrame) scrollFrame=requestAnimationFrame(updateScroll);
}
window.addEventListener('scroll',scheduleScrollUpdate,{passive:true});
window.addEventListener('resize',scheduleScrollUpdate);
window.addEventListener('pageshow',()=>{snapCast=true;scheduleScrollUpdate();});
// Disclosure and image/font loading can move later section anchors.
if ('ResizeObserver' in window) new ResizeObserver(scheduleScrollUpdate).observe(document.querySelector('main'));
reducedMotion.addEventListener('change',()=>{
  cancelRevealHover();
  hero.style.removeProperty('--pointer-x');
  hero.style.removeProperty('--pointer-y');
  if (reducedMotion.matches) {
    removeGalleryOutgoing();
    galleryImage.classList.remove('is-entering');
    if (hero.dataset.reveal==='closing') finishClosingTrailer();
    if (hero.dataset.reveal==='opening') hero.dataset.reveal='open';
  }
  snapCast=true;
  scheduleScrollUpdate();
});
scheduleScrollUpdate();
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const quoteObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting) { entry.target.dataset.visible='true'; quoteObserver.unobserve(entry.target); }
    });
  },{threshold:.12});
  document.querySelectorAll('.press-quote').forEach(quote=>{quote.dataset.animate='true';quoteObserver.observe(quote);});
}
