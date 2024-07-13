import * as THREE from "https://threejs.org/build/three.module.js";

document.getElementById('config3d').style.display = 'none'

// Audio variables
window.AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
let sourceNode = null;
let analyserNode = null;
let amplitudeArray = null;

// Initialize Three.js
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  -1, // Left
  1, // Right
  1, // Top
  -1, // Bottom
  0.1, // Near
  10 // Far
);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const log = document.getElementsByTagName("h1")[0];
const lineSlider = document.getElementById("lineSlider");

const resolution = new THREE.Vector2();
renderer.getDrawingBufferSize(resolution);

const uniforms = {
  uLine: {value: 1.0},
  uAspect: { value: resolution.x / resolution.y },
  uMN: { value: { x: 8, y: 2 } }, // Initial m and n values
  uAB: { value: { x: 3, y: 1 } }, // Initial a and b values
};

// Create the shader material
const material = new THREE.ShaderMaterial({
  vertexShader: `
  varying vec2 vUv;
  
  void main() {
      vUv = uv;
      gl_Position = vec4( position, 1.0 );    
  }
`,
  fragmentShader: `
  #define PI  3.14159265359
  #define PI2 6.28318530718 
  varying vec2 vUv;
  uniform float uAspect;
  uniform vec2 uMN;
  uniform vec2 uAB;
  uniform float uLine;

  // Generates color based on the input parameter
  vec3 palette( float t ) {
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.263,0.416,0.557);

      return a + b*cos( 6.28318*(c*t+d) );
  }

  // Rectangular chladni plate equation
  // pos = (a * sin(pi*m*x) * sin(pi*n*y) + b * sin(pi*n*x) * sin(pi*m*y))
  float chladniPlate(vec2 uv, vec2 mn)
  {
    float a = uAB.x;
    float b = uAB.y;
    return a * sin(mn.x * uv.x) * cos(mn.y * uv.y) + b * sin(mn.y * uv.x) * sin(mn.x * uv.y);
  }

  vec2 toPolar(vec2 xy)
  {
    float phi = atan(xy.y/xy.x) / PI;
    return vec2(
      phi,
      length(xy)
    );
  }

  void main() {
      // m and n part of the equation x PI
      vec2 mn = uMN * PI;
      // Shift the UV to center and correct for the aspect ratio
      vec2 uv = (vUv - vec2(0.5, 0.5)) * vec2(1.0, 1.0/uAspect) * 2.0;    
      vec2 polar = toPolar(uv); // Map the rect to circle

      float force = chladniPlate(polar, mn);
      // Invert the value
      force = 1. - abs(force);
      // Control the line thickness
      force = smoothstep(uLine, 1.0f, force);
      // Limit to circle
      force = step(polar.y, 1.) * force;
      // Color based on the pixel length from the center
      vec3 color = palette(polar.y) * force * 2.0f;

      gl_FragColor = vec4(color, 1.0);
  }
`,
  uniforms,
});

// Full-screen quad to plot the chladni plate onto
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 1, 1), material);
scene.add(quad);

// Handle window resize
window.addEventListener("resize", () => {
  const newWidth = window.innerWidth;
  const newHeight = window.innerHeight;

  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(newWidth, newHeight);
  renderer.getDrawingBufferSize(resolution);
  uniforms.uAspect.value = resolution.x / resolution.y;
});

function updateInputs() {
  const [bass, mid] = deriveValues();
  uniforms.uMN.value.x = Math.max(bass / 13, 3);
  uniforms.uMN.value.y = Math.max(mid / 14, 7);
  uniforms.uAB.value.x = Math.max(mid / 17, 2);
  uniforms.uAB.value.y = Math.max(bass / 15, 4);

  uniforms.uLine.value = 1 - parseFloat(lineSlider.value) / 100;
}

// Function to derive values based on frequency distribution
function deriveValues() {
  if (!amplitudeArray) return [0, 0];
  
  analyserNode.getByteFrequencyData(amplitudeArray);

  // Calculate intensity within each range
  const bassIntensity = getIntensityInRange(amplitudeArray, 60, 250);
  const midIntensity = getIntensityInRange(amplitudeArray, 250, 2000);

  return [bassIntensity, midIntensity];
}

// Function to calculate intensity within a specified frequency range
function getIntensityInRange(dataArray, minFreq, maxFreq) {
  const binSize = audioContext.sampleRate / analyserNode.fftSize; // In HZs
  const startFreq = Math.floor(minFreq / binSize);
  const endFreq = Math.ceil(maxFreq / binSize);
  
  let intensity = 0;
  for (let i = startFreq; i < endFreq; i++) {
    intensity += dataArray[i];
  }
  // Normalize intensity
  return intensity / (endFreq - startFreq);
}

// Render the scene
function animate() {
  requestAnimationFrame(animate);
  updateInputs();
  renderer.render(scene, camera);
}

async function base64ToBufferAsync(base64) {
  const dataUrl = "data:application/octet-binary;base64," + base64;
  const response = await fetch(dataUrl);
  return response.arrayBuffer();
}

function setupAudioNodes() {
  sourceNode = audioContext.createBufferSource();
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 2048;

  // Create the array for the data values
  amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);

  // Now connect the nodes together
  sourceNode.connect(audioContext.destination);
  sourceNode.connect(analyserNode);
}

function stopAudio() {
  if (sourceNode) {
    try {
      sourceNode.stop();
    } catch (ex) {
      // Audio not started
    }
    sourceNode.disconnect();
  }
}

const visualizeAudio = async (url) => {
  stopAudio();
  setupAudioNodes();

  const arrayBuffer = await base64ToBufferAsync(url);
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  sourceNode.buffer = audioBuffer;
  sourceNode.start(0); // Play the sound now
};

function receiveMessage(message) {
  visualizeAudio(message);
}

window.receiveMessage = receiveMessage;
animate();
