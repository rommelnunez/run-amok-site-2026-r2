import {OrthographicCamera, Scene, Vector3} from './vendor/three/three.core.min.js';
import {CSS3DObject, CSS3DRenderer} from './vendor/three/CSS3DRenderer.js';

const portraits = [
  ['alyssa-marvin', 'Alyssa Marvin'],
  ['patrick-wilson', 'Patrick Wilson'],
  ['margaret-cho', 'Margaret Cho'],
  ['sophia-torres', 'Sophia Torres'],
  ['molly-ringwald', 'Molly Ringwald'],
  ['julie-christeas', 'Julie Christeas'],
];
const photos = [
  {src:'assets/bts/on-set-7758.jpg', description:'On the set of Run Amok'},
  {src:'assets/bts/on-set-7817.jpg', description:'Another moment on set'},
  {src:'assets/bts/BTS_IMG_0311.jpg', description:'Cast and crew together at Sundance 2026'},
  ...portraits.map(([slug, name]) => ({
    src: `assets/bts/${slug}.jpg`,
    portrait: true,
    description: `${name} at Sundance 2026`,
  })),
];
const spread = [
  [0, 0, .085], [-.13, .06, -.23], [.18, .105, .21],
  [.16, -.035, -.19], [-.20, -.1, .29], [-.04, .10, -.28],
  [-.17, .08, .10], [.075, -.13, -.05], [-.12, -.05, .19],
];

export function mountPhotoStack(figure, reducedMotion) {
  const table = figure.querySelector('.photo-table');
  const fallback = table.querySelector('.photo-fallback');
  const hint = figure.querySelector('#photo-hint');
  const label = figure.querySelector('.photo-description');
  const scene = new Scene();
  const camera = new OrthographicCamera(0, 1, 1, 0, 1, 2000);
  camera.position.z = 800;
  const renderer = new CSS3DRenderer();
  renderer.domElement.className = 'photo-scene';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  table.append(renderer.domElement);
  const cards = photos.map(photo => {
    const print = document.createElement('div');
    print.className = 'photo-print';
    if (photo.portrait) print.dataset.format = 'portrait';
    const image = new Image();
    image.alt = '';
    image.draggable = false;
    image.decoding = 'async';
    image.src = photo.src;
    print.append(image);
    const card = new CSS3DObject(print);
    card.userData.target = new Vector3();
    scene.add(card);
    return card;
  });

  let index = 0;
  let drag;
  let departing;
  let frame = 0;
  let previousTime = 0;
  let cardWidth = 0;

  function updateCaption() {
    const photo = photos[index];
    label.textContent = `${photo.description}. Photo ${index + 1} of ${photos.length}.`;
  }

  function arrange() {
    cards.forEach((card, cardIndex) => {
      const slot = (cardIndex - index + cards.length) % cards.length;
      const [x, y, angle] = spread[slot];
      card.userData.target.set(x * cardWidth, y * cardWidth, -slot * 12);
      card.userData.angle = angle;
      card.element.dataset.top = String(slot === 0);
    });
  }

  function paint(time) {
    frame = 0;
    const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-Math.min(time - (previousTime || time - 16), 45) / 46);
    previousTime = time;
    let moving = false;
    cards.forEach(card => {
      if (card === drag?.card) return;
      if (card === departing?.card && time >= departing.until) departing = undefined;
      const leaving = card === departing?.card;
      const target = leaving ? departing.target : card.userData.target;
      const angle = leaving ? departing.angle : card.userData.angle;
      card.position.lerp(target, blend);
      card.rotation.x *= 1 - blend;
      card.rotation.y *= 1 - blend;
      card.rotation.z += (angle - card.rotation.z) * blend;
      const scale = card.scale.x + ((leaving ? 1.035 : 1) - card.scale.x) * blend;
      card.scale.setScalar(scale);
      if (leaving) card.element.dataset.lifted = 'true';
      else delete card.element.dataset.lifted;
      if (leaving || card.position.distanceToSquared(target) > .1 || Math.abs(angle - card.rotation.z) > .002 ||
          Math.abs(scale - 1) > .001) moving = true;
      else {
        card.position.copy(target);
        card.rotation.set(0, 0, angle);
        card.scale.setScalar(1);
      }
    });
    renderer.render(scene, camera);
    if (moving) frame = requestAnimationFrame(paint);
  }

  function schedulePaint() {
    if (frame) return;
    previousTime = 0;
    frame = requestAnimationFrame(paint);
  }

  function resize() {
    const width = table.clientWidth;
    const height = table.clientHeight;
    if (!width || !height) return;
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.render(scene, camera);
    const wasSized = cardWidth > 0;
    cardWidth = cards[0].element.offsetWidth;
    arrange();
    if (!wasSized) cards.forEach(card => {
      card.position.copy(card.userData.target);
      card.rotation.z = card.userData.angle;
    });
    renderer.render(scene, camera);
    fallback.hidden = true;
    schedulePaint();
  }

  function step(direction, dx = cardWidth * .66, dy = 14) {
    const card = cards[index];
    if (!reducedMotion.matches && direction === 1) {
      departing = {card, target:card.position.clone().add(new Vector3(dx, -dy, 30)),
        angle:card.rotation.z - Math.sign(dx) * .12, until:performance.now() + 180};
    }
    index = (index + direction + cards.length) % cards.length;
    arrange();
    updateCaption();
    schedulePaint();
  }

  table.addEventListener('keydown', event => {
    if (!['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    if (!event.repeat && !drag) step(event.key === 'ArrowLeft' ? -1 : 1);
  });
  table.addEventListener('click', event => {
    // A synthesized click from assistive technology has no pointer gesture.
    if (event.detail === 0 && !drag) step(1);
  });
  table.addEventListener('pointerdown', event => {
    const card = cards[index];
    if (!event.isPrimary || event.button !== 0 || !card.element.contains(event.target)) return;
    departing = undefined;
    drag = {card, pointer:event.pointerId, x:event.clientX, y:event.clientY, dx:0, dy:0,
      origin:card.position.clone(), angle:card.rotation.z};
    card.element.dataset.lifted = 'true';
    table.setPointerCapture(event.pointerId);
  });
  table.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.pointer) return;
    drag.dx = event.clientX - drag.x;
    drag.dy = event.clientY - drag.y;
    drag.card.position.set(drag.origin.x + drag.dx, drag.origin.y - drag.dy, 30);
    if (!reducedMotion.matches) {
      drag.card.scale.setScalar(1 + Math.min(.055, Math.hypot(drag.dx, drag.dy) / 1700));
      drag.card.rotation.set(
        Math.max(-.22, Math.min(.22, -drag.dy / 420)),
        Math.max(-.27, Math.min(.27, drag.dx / 420)),
        drag.angle + Math.max(-.35, Math.min(.35, -drag.dx / 480)),
      );
    }
    schedulePaint();
  });
  function endDrag(event) {
    if (event.pointerId !== drag?.pointer) return;
    const {card, dx, dy} = drag;
    drag = undefined;
    delete card.element.dataset.lifted;
    if (table.hasPointerCapture(event.pointerId)) table.releasePointerCapture(event.pointerId);
    const distance = Math.hypot(dx, dy);
    if (event.type !== 'pointerup') schedulePaint();
    else if (distance <= 7) step(1);
    else if (distance >= Math.min(cardWidth * .24, 66)) step(1, dx * .65, dy * .65);
    else schedulePaint();
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => table.addEventListener(type, endDrag));
  table.tabIndex = 0;
  table.setAttribute('role', 'button');
  table.setAttribute('aria-label', 'Show next photo');
  table.setAttribute('aria-describedby', hint.id);
  new ResizeObserver(resize).observe(table);
  updateCaption();
  resize();
}
