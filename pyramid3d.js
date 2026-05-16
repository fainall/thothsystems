import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('pyramidCanvas');
if (!canvas) throw new Error('No canvas');

// Container = full hero section
const container = canvas.closest('.hero') || canvas.parentElement;
const W = container.clientWidth;
const H = container.clientHeight;

// ═══════════ RENDERER ═══════════
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;

// ═══════════ SCENE + CAMERA ═══════════
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
camera.position.set(0, 2.0, 5.8);
camera.lookAt(0, 0.5, 0);

// ═══════════ LIGHTS ═══════════
scene.add(new THREE.AmbientLight(0x0a0a2e, 0.3));

const coreLight = new THREE.PointLight(0x3b82f6, 6, 15, 1.5);
coreLight.position.set(0, 1.0, 0);
scene.add(coreLight);

const rimLight = new THREE.PointLight(0xc9a84c, 1.5, 12, 1.5);
rimLight.position.set(3, 4, -2);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0x1e40af, 1.0, 10, 1.5);
fillLight.position.set(-3, 1.5, 2);
scene.add(fillLight);

// ═══════════ PYRAMID GEOMETRY ═══════════
const pyrH = 1.7;
const pyrBase = 2.6;
const half = pyrBase / 2;
const apex = new THREE.Vector3(0, pyrH, 0);
const corners = [
  new THREE.Vector3(-half, 0, half),
  new THREE.Vector3(half, 0, half),
  new THREE.Vector3(half, 0, -half),
  new THREE.Vector3(-half, 0, -half),
];

const solidGeo = new THREE.BufferGeometry();
const verts = new Float32Array([
  ...apex.toArray(), ...corners[0].toArray(), ...corners[1].toArray(),
  ...apex.toArray(), ...corners[1].toArray(), ...corners[2].toArray(),
  ...apex.toArray(), ...corners[2].toArray(), ...corners[3].toArray(),
  ...apex.toArray(), ...corners[3].toArray(), ...corners[0].toArray(),
  ...corners[0].toArray(), ...corners[2].toArray(), ...corners[1].toArray(),
  ...corners[0].toArray(), ...corners[3].toArray(), ...corners[2].toArray(),
]);
solidGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
solidGeo.computeVertexNormals();

// ═══════════ PYRAMID FACE SHADER ═══════════
const pyramidMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uCoreColor: { value: new THREE.Color(0x3b82f6) },
    uEdgeColor: { value: new THREE.Color(0xc9a84c) },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewDir;
    varying float vHeight;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      vHeight = position.y / ${pyrH.toFixed(1)};
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uCoreColor;
    uniform vec3 uEdgeColor;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying vec3 vViewDir;
    varying float vHeight;

    void main() {
      float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
      fresnel = pow(fresnel, 3.0);

      // Scan lines
      float scan = sin(vHeight * 30.0 - uTime * 2.0) * 0.5 + 0.5;
      scan = smoothstep(0.4, 0.6, scan) * 0.15;

      // Height gradient
      vec3 baseColor = mix(uEdgeColor * 0.4, uCoreColor * 0.6, vHeight);

      // Energy pulses
      float pulse = sin(vHeight * 12.0 - uTime * 3.0) * 0.5 + 0.5;
      pulse = pow(pulse, 8.0) * 0.3;

      vec3 color = baseColor * 0.15;
      color += uEdgeColor * fresnel * 0.6;
      color += uCoreColor * scan;
      color += uCoreColor * pulse * (1.0 - vHeight);

      // Iridescence
      float iri = sin(dot(vNormal, vec3(1.0, 0.5, 0.0)) * 4.0 + uTime) * 0.5 + 0.5;
      color += mix(uCoreColor, uEdgeColor, iri) * 0.05;

      float alpha = 0.06 + fresnel * 0.35 + scan + pulse * 0.5;
      alpha = clamp(alpha, 0.0, 0.5);

      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const pyramidMesh = new THREE.Mesh(solidGeo, pyramidMat);
scene.add(pyramidMesh);

// ═══════════ EDGE GLOW SHADER ═══════════
const edgesGeo = new THREE.EdgesGeometry(solidGeo);
const ePositions = edgesGeo.attributes.position.array;
const edgeCount = ePositions.length / 3;
const edgeProgress = new Float32Array(edgeCount);
for (let i = 0; i < edgeCount; i++) {
  edgeProgress[i] = ePositions[i * 3 + 1] / pyrH;
}
edgesGeo.setAttribute('aProgress', new THREE.BufferAttribute(edgeProgress, 1));

const edgeMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uGold: { value: new THREE.Color(0xc9a84c) },
    uBlue: { value: new THREE.Color(0x3b82f6) },
  },
  vertexShader: `
    attribute float aProgress;
    varying float vProgress;
    void main() {
      vProgress = aProgress;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uGold;
    uniform vec3 uBlue;
    varying float vProgress;
    void main() {
      float wave = sin(vProgress * 20.0 - uTime * 4.0) * 0.5 + 0.5;
      wave = pow(wave, 4.0);
      float wave2 = sin(vProgress * 8.0 + uTime * 2.0) * 0.5 + 0.5;
      wave2 = pow(wave2, 6.0);
      vec3 color = mix(uGold, uBlue, wave);
      float alpha = 0.3 + wave * 0.5 + wave2 * 0.3;
      gl_FragColor = vec4(color * (0.8 + wave * 0.5), alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const wireframe = new THREE.LineSegments(edgesGeo, edgeMat);
scene.add(wireframe);

// ═══════════ CORE ORB SHADER ═══════════
const coreGeo = new THREE.SphereGeometry(0.15, 32, 32);
const coreMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(0x3b82f6) },
    uColor2: { value: new THREE.Color(0x60a5fa) },
    uColor3: { value: new THREE.Color(0xc9a84c) },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
    }

    void main() {
      float n1 = noise(vUv * 4.0 + uTime * 0.8);
      float n2 = noise(vUv * 6.0 - uTime * 0.5 + 10.0);
      float plasma = (n1 + n2) * 0.5;
      vec3 color = mix(uColor1, uColor2, plasma);
      color = mix(color, uColor3, pow(plasma, 3.0) * 0.3);
      float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.0);
      color += uColor2 * fresnel * 0.8;
      color *= 1.5;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});

const coreMesh = new THREE.Mesh(coreGeo, coreMat);
coreMesh.position.set(0, 0.65, 0);
scene.add(coreMesh);

// Halo
const haloGeo = new THREE.SphereGeometry(0.4, 32, 32);
const haloMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x3b82f6) },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vViewDir = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 3.0);
      float pulse = 0.8 + sin(uTime * 2.5) * 0.2;
      vec3 color = uColor * fresnel * pulse * 1.2;
      gl_FragColor = vec4(color, fresnel * 0.4 * pulse);
    }
  `,
  transparent: true,
  depthWrite: false,
  side: THREE.BackSide,
  blending: THREE.AdditiveBlending,
});

const haloMesh = new THREE.Mesh(haloGeo, haloMat);
haloMesh.position.copy(coreMesh.position);
scene.add(haloMesh);

// ═══════════ ENERGY RINGS ═══════════
function createShaderRing(radius, color, speed) {
  const geo = new THREE.TorusGeometry(radius, 0.008, 8, 128);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSpeed: { value: speed },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; uniform float uSpeed;
      varying vec2 vUv;
      void main() {
        float dash = sin(vUv.x * 60.0 + uTime * uSpeed) * 0.5 + 0.5;
        dash = smoothstep(0.3, 0.7, dash);
        float bright = sin(vUv.x * 6.2832 - uTime * uSpeed * 0.5) * 0.5 + 0.5;
        bright = pow(bright, 8.0);
        float alpha = dash * 0.2 + bright * 0.6;
        gl_FragColor = vec4(uColor * (0.6 + bright), alpha);
      }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  return { mesh: new THREE.Mesh(geo, mat), mat };
}

const ring1 = createShaderRing(1.8, 0xc9a84c, 3.0);
ring1.mesh.rotation.x = -Math.PI / 2;
ring1.mesh.position.y = 0.05;
scene.add(ring1.mesh);

const ring2 = createShaderRing(2.2, 0x3b82f6, -2.0);
ring2.mesh.rotation.x = -Math.PI / 2;
ring2.mesh.position.y = 0.05;
scene.add(ring2.mesh);

const ring3 = createShaderRing(1.8, 0xc9a84c, 2.5);
ring3.mesh.rotation.x = -Math.PI / 3;
ring3.mesh.rotation.z = Math.PI / 6;
ring3.mesh.position.y = 0.65;
scene.add(ring3.mesh);

// ═══════════ PARTICLES ═══════════
const particleCount = 350;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(particleCount * 3);
const pRand = new Float32Array(particleCount);
const pSpeed = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.random() * Math.PI;
  const r = 1.0 + Math.random() * 3.5;
  pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  pPos[i * 3 + 1] = (r * Math.cos(phi)) * 0.5 + 0.65;
  pPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  pRand[i] = Math.random();
  pSpeed[i] = 0.5 + Math.random() * 1.5;
}

pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aRandom', new THREE.BufferAttribute(pRand, 1));
pGeo.setAttribute('aSpeed', new THREE.BufferAttribute(pSpeed, 1));

const pMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uGold: { value: new THREE.Color(0xc9a84c) },
    uBlue: { value: new THREE.Color(0x3b82f6) },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  },
  vertexShader: `
    attribute float aRandom;
    attribute float aSpeed;
    uniform float uTime;
    uniform float uPixelRatio;
    varying float vRandom;
    void main() {
      vRandom = aRandom;
      vec3 pos = position;
      pos.y += sin(uTime * aSpeed + aRandom * 6.28) * 0.08;
      pos.x += cos(uTime * aSpeed * 0.7 + aRandom * 3.14) * 0.04;
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPos;
      float size = (3.0 + aRandom * 4.0) * uPixelRatio;
      gl_PointSize = size * (1.0 / -mvPos.z);
    }
  `,
  fragmentShader: `
    uniform vec3 uGold; uniform vec3 uBlue; uniform float uTime;
    varying float vRandom;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.1, d);
      vec3 color = mix(uGold, uBlue, step(0.6, vRandom));
      float twinkle = sin(uTime * 3.0 + vRandom * 50.0) * 0.3 + 0.7;
      alpha *= twinkle * 0.7;
      gl_FragColor = vec4(color * 1.5, alpha);
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

// ═══════════ ENERGY BEAMS ═══════════
const beamGeo = new THREE.PlaneGeometry(0.06, 4.0, 1, 32);
const beamMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x3b82f6) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
    void main() {
      float xFade = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 2.0);
      float yFade = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 1.5);
      float energy = pow(sin(vUv.y * 20.0 - uTime * 5.0) * 0.5 + 0.5, 3.0);
      float alpha = xFade * yFade * (0.15 + energy * 0.25);
      gl_FragColor = vec4(uColor * (1.0 + energy * 0.5), alpha);
    }
  `,
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
});

const beam = new THREE.Mesh(beamGeo, beamMat);
beam.position.set(0, 2.2, 0);
scene.add(beam);
const beam2 = beam.clone();
beam2.rotation.y = Math.PI / 2;
scene.add(beam2);

// ═══════════ GROUND GLOW ═══════════
const groundGeo = new THREE.PlaneGeometry(6, 6, 1, 1);
const groundMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x3b82f6) },
    uGold: { value: new THREE.Color(0xc9a84c) },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uTime; uniform vec3 uColor; uniform vec3 uGold; varying vec2 vUv;
    void main() {
      float d = length(vUv - 0.5) * 2.0;
      float glow = pow(1.0 - smoothstep(0.0, 0.8, d), 2.5);
      float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
      float pattern = sin(angle * 4.0 + uTime * 0.5) * 0.5 + 0.5;
      vec3 color = mix(uColor, uGold, pattern * 0.3) * glow;
      gl_FragColor = vec4(color, glow * 0.12);
    }
  `,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});

const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.01;
scene.add(ground);

// ═══════════ PYRAMID GROUP ═══════════
const pyrGroup = new THREE.Group();
pyrGroup.add(pyramidMesh);
pyrGroup.add(wireframe);
pyrGroup.add(coreMesh);
pyrGroup.add(haloMesh);
pyrGroup.add(ring1.mesh);
pyrGroup.add(ring2.mesh);
pyrGroup.add(ring3.mesh);
pyrGroup.add(beam);
pyrGroup.add(beam2);
pyrGroup.add(ground);
pyrGroup.add(particles);

// Pyramid offset down to give header breathing room
let pyrOffsetY = window.innerWidth < 768 ? -0.05 : -0.5;
pyrGroup.position.set(0, pyrOffsetY, 0);
scene.add(pyrGroup);

// ═══════════ LOGO APEX TRACKING ═══════════
const logoEl = document.querySelector('.hero-logo-behind');
const _apexV = new THREE.Vector3();          // reused each frame

function updateLogoToApex() {
  if (!logoEl) return;
  _apexV.set(0, pyrH, 0);                    // apex in local space
  pyrGroup.localToWorld(_apexV);              // → world (includes rotation/scale/pos)
  _apexV.project(camera);                     // → NDC  (-1…1)
  const lx = ( _apexV.x * 0.5 + 0.5) * 100; // → % of container
  const ly = (-_apexV.y * 0.5 + 0.5) * 100;
  logoEl.style.left = lx + '%';
  logoEl.style.top  = ly + '%';
}

// ═══════════ POST-PROCESSING ═══════════
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 1.5, 0.5, 0.15);
composer.addPass(bloomPass);

// ═══════════ MOUSE ═══════════
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

// ═══════════ SCROLL PARALLAX ═══════════
let scrollProgress = 0;
let smoothScroll = 0;
let baseScale = 1.0;
const heroEl = document.getElementById('hero');

function updateScrollProgress() {
  if (!heroEl) return;
  const rect = heroEl.getBoundingClientRect();
  const heroH = heroEl.offsetHeight;
  scrollProgress = Math.max(0, Math.min(1, -rect.top / heroH));
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

function updateBaseScale() {
  const w = container.clientWidth;
  baseScale = w < 768 ? 0.7 : w < 1024 ? 0.7 + (w - 768) / (1024 - 768) * 0.3 : 1.0;
}
updateBaseScale();

// ═══════════ ANIMATION ═══════════
const clock = new THREE.Clock();
let curRotY = 0, curRotX = 0;

// Camera base values
const camBaseZ = 5.8;
const camBaseY = 2.0;

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Smooth scroll interpolation (buttery parallax)
  smoothScroll += (scrollProgress - smoothScroll) * 0.06;
  const sp = smoothScroll;

  // Shader uniforms
  pyramidMat.uniforms.uTime.value = t;
  edgeMat.uniforms.uTime.value = t;
  coreMat.uniforms.uTime.value = t;
  haloMat.uniforms.uTime.value = t;
  pMat.uniforms.uTime.value = t;
  beamMat.uniforms.uTime.value = t;
  groundMat.uniforms.uTime.value = t;
  ring1.mat.uniforms.uTime.value = t;
  ring2.mat.uniforms.uTime.value = t;
  ring3.mat.uniforms.uTime.value = t;

  // ── Scroll-driven transforms ──

  // Rotation: mouse + auto-spin + scroll tilt-back
  const tgtY = mouseX * 0.2;
  const tgtX = mouseY * 0.1 + sp * 0.6;  // tilts back as you scroll
  curRotY += (tgtY - curRotY) * 0.03;
  curRotX += (tgtX - curRotX) * 0.03;
  pyrGroup.rotation.y = curRotY + t * 0.12 + sp * 0.8;  // extra Y spin on scroll
  pyrGroup.rotation.x = curRotX;

  // Position: float upward on scroll (from offset base)
  pyrGroup.position.y = pyrOffsetY + sp * 2.0;

  // Scale: responsive base × scroll shrink (30% smaller at full scroll)
  pyrGroup.scale.setScalar(baseScale * (1 - sp * 0.35));

  // Camera: pull back + lower gaze as pyramid ascends
  camera.position.z = camBaseZ + sp * 3.0;
  camera.position.y = camBaseY - sp * 0.6;
  camera.lookAt(0, 0.5 + sp * 1.0, 0);

  // Bloom: intensify → more ethereal as hero fades
  bloomPass.strength = 1.5 + sp * 2.0;

  // Core pulse + scroll-driven intensity
  const pulse = 1 + Math.sin(t * 2.5) * 0.15;
  coreMesh.scale.setScalar(pulse * (1 + sp * 0.4));
  haloMesh.scale.setScalar(pulse * 1.1 * (1 + sp * 0.6));
  coreLight.intensity = 5 + Math.sin(t * 2.5) * 2 + sp * 4;

  // Particles spread on scroll
  pMat.uniforms.uTime.value = t + sp * 2;

  // Track logo to pyramid apex
  updateLogoToApex();

  composer.render();
}

animate();

// ═══════════ RESIZE ═══════════
function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  pMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  pyrOffsetY = w < 768 ? -0.05 : -0.5;
  updateBaseScale();
}

window.addEventListener('resize', onResize);
