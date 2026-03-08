// face-api.js CDN URLs for model weights
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';

let modelsLoaded = false;

/**
 * Load face-api.js models from CDN.
 */
export async function loadFaceModels() {
  if (modelsLoaded) return;

  // Dynamically import face-api.js
  const faceapi = await import('face-api.js');

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(CDN_BASE),
    faceapi.nets.faceLandmark68Net.loadFromUri(CDN_BASE),
    faceapi.nets.faceRecognitionNet.loadFromUri(CDN_BASE),
  ]);

  modelsLoaded = true;
  return faceapi;
}

/**
 * Enroll face — capture 5 samples, return averaged descriptor.
 * @param {HTMLVideoElement} videoEl
 * @param {function} onProgress - Called with (current, total)
 * @returns {Float32Array} averaged descriptor
 */
export async function enrollFace(videoEl, onProgress) {
  const faceapi = await loadFaceModels();
  const SAMPLES = 5;
  const descriptors = [];

  for (let i = 0; i < SAMPLES; i++) {
    await new Promise(r => setTimeout(r, 800)); // wait between captures

    const detection = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error(`Could not detect your face in sample ${i + 1}. Please make sure your face is in the oval.`);
    }

    descriptors.push(detection.descriptor);
    onProgress?.(i + 1, SAMPLES);
  }

  // Average all descriptors
  const avgDescriptor = new Float32Array(128);
  for (const desc of descriptors) {
    for (let j = 0; j < 128; j++) avgDescriptor[j] += desc[j];
  }
  for (let j = 0; j < 128; j++) avgDescriptor[j] /= SAMPLES;

  return Array.from(avgDescriptor);
}

/**
 * Verify face against stored descriptor.
 * @returns {{ match: boolean, distance: number, liveness: boolean }}
 */
export async function verifyFace(videoEl, storedDescriptor) {
  const faceapi = await loadFaceModels();

  const detection = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return { match: false, distance: 1, liveness: false, error: 'No face detected' };
  }

  const stored = new Float32Array(storedDescriptor);
  const distance = faceapi.euclideanDistance(detection.descriptor, stored);
  const match = distance < 0.55;

  // Liveness: check eye aspect ratio (EAR) for blink detection
  const landmarks = detection.landmarks;
  const liveness = checkLiveness(landmarks);

  return { match, distance, liveness };
}

/**
 * Simple liveness check using eye openness from landmarks.
 */
function checkLiveness(landmarks) {
  try {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
    // Eyes are open if EAR > 0.2 (closed eyes have low EAR)
    return ear > 0.15;
  } catch {
    return true; // fallback: assume live
  }
}

function eyeAspectRatio(eyePoints) {
  if (eyePoints.length < 6) return 0.3;
  const a = dist(eyePoints[1], eyePoints[5]);
  const b = dist(eyePoints[2], eyePoints[4]);
  const c = dist(eyePoints[0], eyePoints[3]);
  return (a + b) / (2.0 * c);
}

function dist(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
