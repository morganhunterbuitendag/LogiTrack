// Particle sphere visualization adapted for the AI page
let scene, camera, renderer, particleSystem, controls;
let container;
const particleCount = 20000;
const sphereRadius = 250;
let initialPositions = [];
let targetPositions = [];
let buildProgress = 0;
const buildSpeed = 0.008;
let sphereBuilt = false;
let rotationSpeedX = 0;
let rotationSpeedY = 0;
let rotationSpeedZ = 0;
let framesUntilChange = 0;

function init() {
  container = document.getElementById('ai-canvas-container');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, 0.0015);

  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 1, 3000);
  camera.position.z = 600;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0xffffff);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const baseColor = new THREE.Color();

  for (let i = 0; i < particleCount; i++) {
    const ix = (Math.random() - 0.5) * 2000;
    const iy = (Math.random() - 0.5) * 2000;
    const iz = (Math.random() - 0.5) * 2000;
    initialPositions.push(ix, iy, iz);
    positions[i * 3] = ix;
    positions[i * 3 + 1] = iy;
    positions[i * 3 + 2] = iz;

    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / particleCount);
    const tx = sphereRadius * Math.sin(phi) * Math.cos(theta);
    const ty = sphereRadius * Math.sin(phi) * Math.sin(theta);
    const tz = sphereRadius * Math.cos(phi);
    targetPositions.push(tx, ty, tz);

    baseColor.setHSL(0.6, 1.0, 0.5 + Math.random() * 0.2);
    colors[i * 3] = baseColor.r;
    colors[i * 3 + 1] = baseColor.g;
    colors[i * 3 + 2] = baseColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2.5,
    vertexColors: true,
    blending: THREE.NormalBlending,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });

  particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 100;
  controls.maxDistance = 1500;
  controls.autoRotate = false;

  window.addEventListener('resize', onWindowResize, false);
  document.getElementById('info').textContent = 'Particles forming sphere...';
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const positionsAttribute = particleSystem.geometry.attributes.position;
  const currentPositions = positionsAttribute.array;

  if (!sphereBuilt) {
    buildProgress += buildSpeed;
    if (buildProgress >= 1) {
      buildProgress = 1;
      sphereBuilt = true;
      const infoEl = document.getElementById('info');
      if (infoEl) infoEl.style.display = 'none';
    }
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      currentPositions[idx] = initialPositions[idx] + (targetPositions[idx] - initialPositions[idx]) * buildProgress;
      currentPositions[idx + 1] = initialPositions[idx + 1] + (targetPositions[idx + 1] - initialPositions[idx + 1]) * buildProgress;
      currentPositions[idx + 2] = initialPositions[idx + 2] + (targetPositions[idx + 2] - initialPositions[idx + 2]) * buildProgress;
    }
    positionsAttribute.needsUpdate = true;
  } else {
    if (framesUntilChange <= 0) {
      const minAbsSpeed = 0.0008;
      const speedRange = 0.0022;
      const getNewSpeed = () => {
        const speed = minAbsSpeed + Math.random() * speedRange;
        return speed * (Math.random() < 0.5 ? 1 : -1);
      };
      rotationSpeedX = getNewSpeed();
      rotationSpeedY = getNewSpeed();
      rotationSpeedZ = getNewSpeed();
      framesUntilChange = 180 + Math.random() * 120;
    }
    particleSystem.rotation.x += rotationSpeedX;
    particleSystem.rotation.y += rotationSpeedY;
    particleSystem.rotation.z += rotationSpeedZ;
    framesUntilChange--;
  }

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('load', () => {
  try {
    init();
    animate();
    const askBtn = document.getElementById('ask-btn');
    const msgEl = document.getElementById('ai-message');
    if (askBtn) {
      askBtn.addEventListener('click', () => {
        if (msgEl) {
          msgEl.textContent = '⚠️ AI link disconnected. Please try again later.';
          msgEl.style.display = 'block';
          msgEl.style.opacity = '1';
          setTimeout(() => { msgEl.style.opacity = '0'; }, 4000);
          setTimeout(() => { msgEl.style.display = 'none'; }, 4500);
        } else {
          alert('AI link disconnected. Please try again later.');
        }
      });
    }
  } catch (error) {
    console.error('Error initializing WebGL:', error);
    const info = document.getElementById('info');
    if (info) info.textContent = 'Error: Could not initialize WebGL.';
  }
});
