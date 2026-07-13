const progress = document.querySelector('.progress span');
const updateProgress = () => {
  const maximum = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${maximum ? (window.scrollY / maximum) * 100 : 0}%`;
};
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

document.querySelectorAll('details').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    document.querySelectorAll('details[open]').forEach((other) => {
      if (other !== detail) other.removeAttribute('open');
    });
  });
});

const canvas = document.querySelector('#systems-field');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas && !reducedMotion) {
  const context = canvas.getContext('2d');
  const pointer = { x: -9999, y: -9999, previousX: -9999, previousY: -9999, active: false, speed: 0 };
  let nodes = [];
  let ripples = [];
  let width = 0;
  let height = 0;
  let lastTime = performance.now();

  const distance = (one, two) => Math.hypot(one.x - two.x, one.y - two.y);
  const rgba = (red, green, blue, alpha) => `rgba(${red}, ${green}, ${blue}, ${alpha})`;

  const resizeField = () => {
    const density = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * density);
    canvas.height = Math.floor(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    const count = Math.max(34, Math.min(92, Math.floor((width * height) / 19000)));
    nodes = Array.from({ length: count }, () => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return { x, y, homeX: x, homeY: y, vx: 0, vy: 0, radius: Math.random() * 1.3 + 0.45, phase: Math.random() * Math.PI * 2 };
    });
  };

  const drawLine = (start, end, colour, alpha, lineWidth = 0.65) => {
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.strokeStyle = colour(alpha);
    context.lineWidth = lineWidth;
    context.stroke();
  };

  const drawField = (now) => {
    const delta = Math.min((now - lastTime) / 16.67, 2);
    lastTime = now;
    context.clearRect(0, 0, width, height);

    if (pointer.active) {
      const halo = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 245);
      halo.addColorStop(0, rgba(200, 255, 106, 0.16));
      halo.addColorStop(0.32, rgba(139, 156, 255, 0.07));
      halo.addColorStop(1, rgba(8, 9, 9, 0));
      context.beginPath();
      context.arc(pointer.x, pointer.y, 245, 0, Math.PI * 2);
      context.fillStyle = halo;
      context.fill();
    }

    nodes.forEach((node) => {
      const toPointer = distance(node, pointer);
      const force = pointer.active ? Math.max(0, 1 - toPointer / 250) : 0;
      if (force > 0) {
        const angle = Math.atan2(node.y - pointer.y, node.x - pointer.x);
        node.vx += Math.cos(angle) * force * (0.32 + pointer.speed * 0.015);
        node.vy += Math.sin(angle) * force * (0.32 + pointer.speed * 0.015);
      }
      node.vx += (node.homeX - node.x) * 0.006;
      node.vy += (node.homeY - node.y) * 0.006;
      node.vx *= 0.92;
      node.vy *= 0.92;
      node.x += node.vx * delta;
      node.y += node.vy * delta;

      const glow = force * 0.95;
      context.beginPath();
      context.arc(node.x, node.y, node.radius + glow * 1.7, 0, Math.PI * 2);
      context.fillStyle = rgba(200, 255, 106, 0.16 + glow * 0.84);
      context.fill();

      if (force > 0.04) drawLine(pointer, node, (alpha) => rgba(200, 255, 106, alpha), force * 0.58, 0.85);
    });

    for (let first = 0; first < nodes.length; first += 1) {
      for (let second = first + 1; second < nodes.length; second += 1) {
        const a = nodes[first];
        const b = nodes[second];
        const between = distance(a, b);
        const local = pointer.active ? Math.min(distance(a, pointer), distance(b, pointer)) : 999;
        if (between < 165 && local < 330) {
          const alpha = (1 - between / 165) * (1 - local / 330) * 0.65;
          drawLine(a, b, (value) => rgba(139, 156, 255, value), alpha, 0.8);
        } else if (between < 85 && (first + second) % 3 === 0) {
          drawLine(a, b, (value) => rgba(137, 151, 145, value), 0.075);
        }
      }
    }

    ripples = ripples.filter((ripple) => now - ripple.started < 1300);
    ripples.forEach((ripple) => {
      const age = (now - ripple.started) / 1300;
      const radius = 18 + age * 170;
      context.beginPath();
      context.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      context.strokeStyle = rgba(200, 255, 106, (1 - age) * 0.68);
      context.lineWidth = 1;
      context.stroke();
    });

    if (pointer.active) {
      context.beginPath();
      context.arc(pointer.x, pointer.y, 5 + Math.min(pointer.speed, 12), 0, Math.PI * 2);
      context.strokeStyle = rgba(255, 140, 114, 1);
      context.lineWidth = 1.2;
      context.stroke();
    }
    window.requestAnimationFrame(drawField);
  };

  window.addEventListener('pointermove', (event) => {
    pointer.speed = Math.min(20, Math.hypot(event.clientX - pointer.previousX, event.clientY - pointer.previousY));
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });
  window.addEventListener('pointerdown', (event) => { ripples.push({ x: event.clientX, y: event.clientY, started: performance.now() }); }, { passive: true });
  document.addEventListener('mouseleave', () => { pointer.active = false; });
  window.addEventListener('blur', () => { pointer.active = false; });
  window.addEventListener('resize', resizeField, { passive: true });
  resizeField();
  window.requestAnimationFrame(drawField);
}
