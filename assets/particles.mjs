import * as THREE from "https://threejs.org/build/three.module.js";


// Audio variables
window.AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();
let sourceNode = null;
let analyserNode = null;
let amplitudeArray = null;

document.getElementById('config2d').style.display = 'none'



const config = {
  dotSize: 0.3,             // Increase dot size for better visibility
  soundSmoothing: 10,       // Decrease smoothing for more responsive changes to the beat
  rangeBassMin: 20,         // Lower bass range minimum for more bass sensitivity
  rangeBassMax: 300,        // Adjust bass range maximum for more precise bass detection
  rangeMidMin: 200,         // Lower mid range minimum for more mid-range sensitivity
  rangeMidMax: 1500,        // Adjust mid range maximum for more precise mid-range detection
  minM: 2,
  divM: 10,                 // Reduce divisor for more pronounced changes in the pattern
  minN: 3,
  divN: 18,                 // Reduce divisor for more pronounced changes in the pattern
  divA: 150,                // Adjust divA for more dynamic pattern variations
  divB: 300,                // Adjust divB for more dynamic pattern variations
  minA: 1,
  minB: 1,
  maxM: 5,                  // Lower maxM for more frequent pattern changes
  maxN: 5,                  // Lower maxN for more frequent pattern changes
  maxA: 1.5,                // Increase maxA for greater amplitude variation
  maxB: 1.5,                // Increase maxB for greater amplitude variation
  offsetStrength: 0.1,      // Increase offset strength for more pronounced visual changes
  chladni2dStrength: 0.05   // Increase 2D strength for more visible 2D pattern variations
};


// const config = {
//   dotSize: .4,
//   soundSmoothing: 20,
//   rangeBassMin: 60,
//   rangeBassMax: 250,
//   rangeMidMin: 250,
//   rangeMidMax: 2000,
//   minM: 2,
//   divM: 32,
//   minN: 3,
//   divN: 26,
//   divA: 200,
//   divB: 500,
//   minA: 1,
//   minB: 1,
//   maxM: 9999,
//   maxN: 9999,
//   maxA: 1,
//   maxB: 1,
//   offsetStrength: .07,
//   chladni2dStrength: .05
// }

const radius = window.innerWidth > 600 ? 20 : 10;

const AMOUNTX = 140, AMOUNTY = 80;
let camera, scene, renderer;
const fov = 30;
let  m = 2, n = 2, a = 1, b = 1;


// chladni 2D closed-form solution - returns between -1 and 1
const chladni = (x, y, a, b, m, n) => {
  return Math.cos(m * Math.PI * x / a) * Math.cos(n * Math.PI * y / b) - Math.cos(n * Math.PI * x / a) * Math.cos(m * Math.PI * y / b)
}

function chladn3D(vm, vn, va, vb, vt, v2d = 0)
{
  const [a, b, m, n, t] = [va || 1, vb || 1, vm || 3, vn || 2, vt || 0]

  const offset2D = 0

  for(let x = 0; x < AMOUNTY; ++x) for(let y = 0; y < AMOUNTX; ++y)
  {
    const x2 = x / AMOUNTY
    const y2 = y / (AMOUNTX / 2)

    v2d = 0

    if(offset2D === 0 || (x2 > offset2D && x2 < (1 - offset2D) && y2 > (offset2D * 1) && y2 < (1 - (offset2D))))
    {

      let x3, y3

      if(offset2D > 0)
      {
        x3 = (1 - (x2 - offset2D) * (1 / (1 - offset2D))) * 2.2
        y3 = (1 - (y2 - offset2D * 1) * (2 / (1 - offset2D * 1))) * 1.1
      }
      else
      {
        x3 = (1 - x2) * 2.2
        y3 = (1 - (y2) * 2) * 1.1
      }


      v2d = chladni(x3 - .3, y3 - .3, a, b, m, n)


      //v2d = Math.min(.1, Math.max(-.1, v2d))

      /*if(Math.abs(v2d) > .25)
        v2d = 0
      else
        v2d = .1*/

      v2d = Math.sin(v2d * Math.PI) * config.chladni2dStrength
    }


    let offset = a * Math.sin((n * x2 * Math.PI)) * Math.sin((m * y2 * Math.PI)) + b * Math.sin((m * x2 * Math.PI)) * Math.sin((n * y2 * Math.PI))
    offset = 1 + (offset * config.offsetStrength) + v2d
    const newPos = {
      x: spherePoints[x][y].x * offset,
      y: spherePoints[x][y].y * offset,
      z: spherePoints[x][y].z * offset
    }

    pointElems[x][y].position.x = newPos.x
    pointElems[x][y].position.y = newPos.y
    pointElems[x][y].position.z = newPos.z
    pointElems[x][y].material = getMaterial(-newPos.z * 15 + 70);
  }
}

function updateSpritesFacingCamera() {
  const vec = new THREE.Vector3();
  return function () {
    vec.setFromMatrixPosition(camera.matrixWorld);
    sprites.forEach(sprite => sprite.lookAt(vec))
  };
}
const dotTexture2 = new THREE.TextureLoader().load('data:image/png;base64,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', () => init())
function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255);
}

const materials = []
function createMats()
{
  for(let i = 0; i < 360; ++i)
  {
    materials.push(new THREE.SpriteMaterial({  color: hslToHex(i + 70, 55, 50), map: dotTexture2}))
  }
}



function getMaterial(hue)
{
  hue = ~~(((hue % 360) + 360) % 360)
  return materials[hue]
}

function generatePointsOnSphereGrid(radius, rows, cols) {
  const points = [];

  for (let i = 0; i < rows; i++) {
    let theta, y, radiusAtY
    //if(i >= rows/2) //set to true for sphere
    if(true) //set to true for sphere
    {
      theta = Math.PI * (i + 0.5) / rows
      y = Math.cos(theta)
      radiusAtY = Math.sin(theta)
    }
    else
    {
      theta = Math.PI * (i + 0.5) / rows
      y = Math.cos(theta)
      radiusAtY = 1 + (Math.cos(theta) ** 3) / 1.3
    }

    points[i] = []
    spherePoints[i] = [];
    pointElems[i] = []

    for (let j = 0; j < cols; j++) {
      let phi = 2 * Math.PI * j / cols;
      let create = true

      if(j >= cols/2)
      {
        phi = 0
        create = false
      }

      let x = Math.cos(phi) * radiusAtY;
      let z = Math.sin(phi) * radiusAtY;

      //let newPoint = new Vector(x * radius, y * radius, z * radius)
      let newPoint = {x: x * radius,y: y * radius, z: z * radius}

      points[i].push(newPoint);
      spherePoints[i].push(newPoint);
      //createDot(newPoint)
      const sprite = createSprite(newPoint.x, newPoint.y, newPoint.z, create)
      pointElems[i][j] = sprite
    }
  }

  return points;
}
function createSprite(x, y, z, addToGrup = true)
{
  const sprite = new THREE.Sprite(getMaterial((-z) * 10));
  sprite.scale.set(config.dotSize, config.dotSize, config.dotSize)
  if(addToGrup)
    spriteGroup.add(sprite);
  sprites.push(sprite)
  sprite.position.set(x, y, z);
  return sprite
}
function updateSize()
{
  config.dotSize = +document.getElementById('dotSize').value
  sprites.forEach(sprite => sprite.scale.set(config.dotSize, config.dotSize, config.dotSize))
  renderer.render( scene, camera );
}


const spherePoints = []
const pointElems = []
const spriteGroup =  new THREE.Group();
const sprites = []
function init() {
  camera = new THREE.PerspectiveCamera( fov, window.innerWidth / window.innerHeight, 0.1, 1000);


  scene = new THREE.Scene();


  scene.add(spriteGroup);

  createMats()

  const numParticles = AMOUNTX * AMOUNTY;

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setSize(window.innerWidth, window.innerHeight);

  //document.body.innerHTML  = ''
  document.body.appendChild(renderer.domElement);
  console.log('ADDED')
  //renderer.clear();

  generatePointsOnSphereGrid(radius, AMOUNTY, AMOUNTX)

  window.addEventListener( 'resize', onWindowResize );
  onWindowResize();

  console.log(sprites)
  console.log(camera)

  //document.getElementById('dotSize').addEventListener('change', updateSize)

  //;['offsetStrength', 'soundSmoothing', 'rangeMidMax', 'rangeMidMin', 'rangeBassMax', 'rangeBassMin', 'maxN', 'maxM', 'maxA', 'maxB', 'minN', 'minM', 'minA', 'minB', 'divN', 'divM', 'divA', 'divB'].forEach(key =>  document.getElementById(key).addEventListener('change', e => config[key] = +e.target.value))
  ;['soundSmoothing', 'chladni2dStrength'].forEach(key =>  document.getElementById(key).addEventListener('change', e => config[key] = +e.target.value))

  render()

}

function onWindowResize() {

}

function animate() {
  updateInputs();
  render();
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}
const clock = new THREE.Clock();
let currentN = 0
function render() {
  const delta = clock.getDelta();

  currentN += delta * 0.5

  spriteGroup.position.z = -100;
  spriteGroup.position.y = 0;
  //spriteGroup.rotation.y = Math.PI + .15;
  spriteGroup.rotation.y = Math.PI;
  //spriteGroup.rotation.x = -Math.PI + .3;
  spriteGroup.rotation.x = -Math.PI;
  spriteGroup.rotation.z = -Math.PI / 4;

  updateSpritesFacingCamera();

  //chladn3D(7.275 + Math.cos(currentN) * 3.216, 7.364 + -Math.cos(currentN + 1) * 3.304)
  chladn3D(getValue('m'), getValue('n'), getValue('a'), getValue('b'), currentN)

  renderer.render( scene, camera );

  //requestAnimationFrame(render);
}
const smoothValues = {
  n: Array(config.soundSmoothing).fill(2),
  m: Array(config.soundSmoothing).fill(2),
  a: Array(config.soundSmoothing).fill(1),
  b: Array(config.soundSmoothing).fill(1),
}
function getValue(value)
{
  let val = 0
  smoothValues[value].forEach(n => val += n)
  return val / smoothValues[value].length
}
function updateInputs() {
  const [bass, mid] = deriveValues();

  smoothValues['m'].push(Math.min(config.maxM, Math.max(bass / config.divM, config.minM)));
  smoothValues['n'].push(Math.min(config.maxN, Math.max(mid / config.divN, config.minN)));

  smoothValues['m'].shift()
  smoothValues['n'].shift()

  smoothValues['b'].push(Math.min(config.maxB, Math.max(bass / config.divB + 1, config.minB)));
  smoothValues['a'].push(Math.min(config.maxA, Math.max(mid / config.divA + 1, config.minA)));

}

// Function to derive four values based on frequency distribution
function deriveValues() {
  if(!amplitudeArray) return [0,0,0];
  // Define frequency ranges (adjust these according to your needs)

  const bassRange = [config.rangeBassMin, config.rangeBassMax]; // Bass frequencies
  const midRange = [config.rangeMidMin, config.rangeBassMax]; // Midrange frequencies
  // const trebleRange = [2000, 4000]; // Treble frequencies
  // const highRange = [4000, 20000]; // High frequencies

  // Calculate intensity within each range
  analyserNode.getByteFrequencyData(amplitudeArray);
  const bassIntensity = getIntensityInRange(amplitudeArray, bassRange);
  const midIntensity = getIntensityInRange(amplitudeArray, midRange);
  // const trebleIntensity = getIntensityInRange(amplitudeArray, trebleRange);
  // const highIntensity = getIntensityInRange(amplitudeArray, highRange);

  // Return the derived values
  return [bassIntensity, midIntensity];
}

// Function to calculate intensity within a specified frequency range
function getIntensityInRange(dataArray, range) {
  const binSize = audioContext.sampleRate / analyserNode.fftSize; // In HZs
  const startFreq = Math.round(range[0] / binSize);
  const endFreq = Math.round(range[1] / binSize);
  let intensity = 0;
  for (let i = startFreq; i < endFreq; i++) {
    intensity += dataArray[i];
  }
  // Normalize intensity
  intensity /= endFreq - startFreq;
  return intensity;
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
  try{
    sourceNode.stop();
  } catch(ex) {
    // Audio not started
    return;
  }

  sourceNode.disconnect();
}

const visualizeAudio = async (base64data) => {
  stopAudio();
  setupAudioNodes();

  const arrayBuffer = await base64ToBufferAsync(base64data);
  console.log(arrayBuffer)
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  console.log(audioBuffer)

  sourceNode.addEventListener("ended", (_) => {
    renderer.setAnimationLoop(null);
    smoothValues['m'] = Array(config.soundSmoothing).fill(2)
    smoothValues['n'] = Array(config.soundSmoothing).fill(2)
    smoothValues['a'] = Array(config.soundSmoothing).fill(1)
    smoothValues['b'] = Array(config.soundSmoothing).fill(1)
  });

  sourceNode.buffer = audioBuffer;
  sourceNode.start(0); // Play the sound now
  renderer.setAnimationLoop(animate);
};

function receiveMessage(message) {
  visualizeAudio(message);
  console.log(message)
}

window.addEventListener(
    "message",
    (event) => {
      console.log('received message')
      console.log(config)
        receiveMessage(event.data)
    },
    false,
);

window.receiveMessage = receiveMessage;

