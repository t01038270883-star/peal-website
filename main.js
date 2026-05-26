// ──────────────────────────────────────────────────
//  PEAL© — main.js
// ──────────────────────────────────────────────────

import * as THREE from 'three';
import { STLLoader }     from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ── 1. CUSTOM CURSOR ─────────────────────────────
const cursorEl = document.createElement('div');
cursorEl.className = 'cursor';
document.body.appendChild(cursorEl);

document.addEventListener('mousemove', e => {
  cursorEl.style.left = e.clientX + 'px';
  cursorEl.style.top  = e.clientY + 'px';
});
document.querySelectorAll('a, .card, .focus-btn, .link-btn').forEach(el => {
  el.addEventListener('mouseenter', () => cursorEl.classList.add('big'));
  el.addEventListener('mouseleave', () => cursorEl.classList.remove('big'));
});

// ── 2. THREE.JS SCENE ────────────────────────────
const canvas = document.getElementById('peal-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace    = THREE.SRGBColorSpace;
renderer.setClearColor(0xF5F4F0, 0); // 투명 – CSS 배경 사용

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

// ── RoomEnvironment ───────────────────────────────
const pmrem  = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;
pmrem.dispose();

// ── OrbitControls ─────────────────────────────────
const controls = new OrbitControls(camera, canvas);
controls.enableDamping   = true;
controls.dampingFactor   = 0.05;
controls.enableZoom      = false;
controls.enablePan       = false;
controls.autoRotate      = true;
controls.autoRotateSpeed = 0.6;
controls.minPolarAngle   = Math.PI * 0.25;
controls.maxPolarAngle   = Math.PI * 0.75;

// ── 조명 ─────────────────────────────────────────
// 밝은 키 라이트 (상단 앞 → 이미지의 밝은 하이라이트)
const keyLight = new THREE.DirectionalLight(0xFFFFFF, 3.5);
keyLight.position.set(2, 6, 4);
scene.add(keyLight);

// 사이드 림 라이트 (파란빛 반사)
const rimLight = new THREE.DirectionalLight(0x6699CC, 1.8);
rimLight.position.set(-5, 2, -2);
scene.add(rimLight);

// 하단 필 라이트
const fillLight = new THREE.DirectionalLight(0xAABBCC, 0.8);
fillLight.position.set(0, -4, 3);
scene.add(fillLight);

// Ambient (약하게 – 그림자 살리기)
scene.add(new THREE.AmbientLight(0xCCDDFF, 0.4));

// ── 메탈릭 재질 – 다크 건메탈 블루 ──────────────
// 레퍼 이미지: 짙은 네이비/건메탈 + 강한 크롬 반사
const metalMat = new THREE.MeshStandardMaterial({
  color:           new THREE.Color(0x1C2840), // 다크 건메탈 블루
  metalness:       1.0,
  roughness:       0.04,                       // 매우 낮음 → 크롬 느낌
  envMapIntensity: 3.0,
});

// ── 로딩 UI ──────────────────────────────────────
const loadingEl = document.createElement('div');
loadingEl.id = 'peal-loading';
loadingEl.innerHTML = `<div class="load-inner"><div class="load-bar"><div class="load-fill" id="load-fill"></div></div><span id="load-pct">0%</span></div>`;
document.querySelector('.hero').appendChild(loadingEl);

function updateProgress(pct) {
  const fill = document.getElementById('load-fill');
  const pctEl = document.getElementById('load-pct');
  if (fill)  fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = Math.round(pct) + '%';
}
function hideLoading() {
  const el = document.getElementById('peal-loading');
  if (el) { el.style.opacity = '0'; setTimeout(() => el.remove(), 600); }
}

// ── STL 로드 ─────────────────────────────────────
let pealMesh    = null;
let meshBaseScale = 1;

new STLLoader().load(
  'public/peal.stl',
  geometry => {
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, metalMat);

    // 크기·위치 정규화
    const box    = new THREE.Box3().setFromObject(mesh);
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    meshBaseScale = 1.8 / maxDim;
    mesh.scale.setScalar(meshBaseScale);

    const center = box.getCenter(new THREE.Vector3()).multiplyScalar(meshBaseScale);
    mesh.position.sub(center);

    pealMesh = mesh;
    scene.add(mesh);
    hideLoading();
    console.log('✅ STL loaded:', size);
  },
  xhr => {
    if (xhr.total) updateProgress((xhr.loaded / xhr.total) * 100);
  },
  err => {
    console.error('STL load failed:', err);
    hideLoading();
    createFallback();
  }
);

// ── 폴백 메쉬 (STL 로드 실패 시) ─────────────────
function createFallback() {
  const geo = new THREE.SphereGeometry(1, 96, 96);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n =
      Math.sin(x * 2.5 + y * 1.8) * 0.07 +
      Math.sin(y * 3.2 + z * 2.0) * 0.05 +
      Math.cos(z * 2.1 + x * 2.9) * 0.04;
    const len = Math.sqrt(x*x + y*y + z*z);
    pos.setXYZ(i, x/len*(1+n)*1.1, y/len*(1+n)*0.82, z/len*(1+n));
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, metalMat);
  meshBaseScale = 1;
  pealMesh = mesh;
  scene.add(mesh);
}

// ── ANIMATE ──────────────────────────────────────
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (pealMesh) {
    const breathe = meshBaseScale * (1 + Math.sin(t * 0.75) * 0.008);
    pealMesh.scale.setScalar(breathe);
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ── RESIZE ───────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── 3. CARDS PARALLAX ────────────────────────────
const cardDefs = [
  { sel: '.card-1', rot: -4, depth: 0.8 },
  { sel: '.card-2', rot:  3, depth: 1.2 },
  { sel: '.card-3', rot:  5, depth: 0.6 },
  { sel: '.card-4', rot: -3, depth: 1.0 },
];
document.addEventListener('mousemove', e => {
  const dx = e.clientX / window.innerWidth  - 0.5;
  const dy = e.clientY / window.innerHeight - 0.5;
  cardDefs.forEach(({ sel, rot, depth }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.style.transform = `rotate(${rot}deg) translate(${dx*depth*24}px,${dy*depth*16}px)`;
  });
});

// ── 4. SCROLL REVEAL ─────────────────────────────
const revealEls = document.querySelectorAll(
  '.concept-header,.concept-body,.portfolio-header,.story-text,.story-visual,.connect-inner'
);
revealEls.forEach(el => el.classList.add('reveal'));

const io = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view'); }),
  { threshold: 0.12 }
);
revealEls.forEach(el => io.observe(el));

// ── 5. DRAG 힌트 ──────────────────────────────────
canvas.addEventListener('mousedown', () => {
  document.querySelector('.drag-hint')?.style.setProperty('opacity','0');
  controls.autoRotate = false;
}, { once: true });
