/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Main Application - Hybrid Functional Architecture
 * Combining functional core with pragmatic imperative shell
 */

import { GoogleGenAI, Modality } from "https://esm.sh/@google/genai@1.0.0";
import { registerServiceWorker } from './effects.js';
import { getDOMElements, renderLoadingState, renderError, renderModal, resetUI } from './view.js';
import { isValidApiKey, createStylePrompt } from './functional-core.js';

// Register service worker
registerServiceWorker('./sw.js')
  .run()
  .then(
    reg => console.log('ServiceWorker registered:', reg.scope),
    err => console.warn('ServiceWorker registration failed:', err)
  );

// ============================================================================
// APPLICATION STATE
// ============================================================================

const createAppState = () => ({
  ai: null,
  capturedFrames: [],
  stylizedFrames: [],
  mediaType: 'none',
  downloadableUrl: null,
  downloadableFilename: '',
  currentFrameIndex: 0,
  mediaStream: null,
  previewAnimationId: null,
  outputAnimationId: null,
  isImageAVisible: true
});

let state = createAppState();

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const elements = getDOMElements();

// Validate DOM
if (Object.values(elements).some(el => !el)) {
  console.error("Fatal Error: One or more essential DOM elements are missing.");
  document.body.innerHTML = "<h1>Error: Application could not start.</h1>";
  throw new Error("Missing DOM elements");
}

// ============================================================================
// INITIALIZATION
// ============================================================================

initializeApp();

function initializeApp() {
  checkApiKey();
  setupEventListeners();
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

function checkApiKey() {
  const envKey = process.env.API_KEY;
  const storedKey = localStorage.getItem('gemini_api_key');
  const isPlaceholder = !envKey || envKey === 'TU_API_KEY_AQUI';

  if (!isPlaceholder) {
    initializeAI(envKey);
  } else if (storedKey) {
    initializeAI(storedKey);
  } else {
    renderModal(elements, true);
  }
}

function initializeAI(key) {
  if (!isValidApiKey(key)) {
    renderError(elements, "Invalid API Key format");
    return;
  }
  
  try {
    state.ai = new GoogleGenAI({ apiKey: key });
    console.log("Gemini AI initialized.");
    renderModal(elements, false);
  } catch (e) {
    console.error("Failed to initialize AI:", e);
    renderError(elements, "Invalid API Key");
  }
}

function handleSaveApiKey() {
  const key = elements.apiKeyInput.value.trim();
  if (key.length > 0) {
    localStorage.setItem('gemini_api_key', key);
    initializeAI(key);
  } else {
    alert("Please enter a valid API Key.");
  }
}

function handleResetApiKey() {
  localStorage.removeItem('gemini_api_key');
  window.location.reload();
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Upload controls
  elements.uploadLabel.addEventListener('click', () => elements.mediaUpload.click());
  elements.mediaUpload.addEventListener('change', handleMediaUpload);
  elements.cameraBtn.addEventListener('click', handleOpenCamera);
  
  // Frame controls
  elements.frameSlider.addEventListener('input', () => {
    elements.frameCount.textContent = elements.frameSlider.value;
  });
  elements.extractFramesBtn.addEventListener('click', handleExtractFrames);
  
  // Generate and download
  elements.generateBtn.addEventListener('click', handleGenerate);
  elements.downloadBtn.addEventListener('click', handleDownload);
  
  // Camera controls
  elements.photoCaptureBtn.addEventListener('click', handleCapturePhoto);
  elements.closeCameraBtn.addEventListener('click', handleCloseCamera);
  
  // API Key controls
  elements.saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
  elements.resetKeyBtn.addEventListener('click', handleResetApiKey);
}

// ============================================================================
// MEDIA UPLOAD HANDLERS
// ============================================================================

async function handleMediaUpload() {
  const file = elements.mediaUpload.files?.[0];
  if (!file) return;

  if (file.type.startsWith('image/')) {
    await processImageFile(file);
  } else if (file.type.startsWith('video/')) {
    processVideoFile(file);
  } else {
    renderError(elements, "Unsupported file type. Please upload an image or video.");
  }
  elements.mediaUpload.value = '';
}

async function processImageFile(file) {
  resetState();
  state.mediaType = 'image';
  
  try {
    const frame = await fileToGenerativePart(file);
    state.capturedFrames = [frame];
    
    elements.imagePreview.src = frame.src;
    elements.imagePreview.classList.remove('hidden');
    elements.previewPlaceholder.classList.add('hidden');
    elements.videoPreview.classList.add('hidden');
    elements.frameControls.classList.add('hidden');
    elements.generateBtn.disabled = false;
    elements.generateBtn.textContent = 'Apply Style';
  } catch (error) {
    console.error('Error processing file:', error);
    renderError(elements, 'Could not process the uploaded file.');
  }
}

function processVideoFile(file) {
  resetState();
  state.mediaType = 'video';
  
  const videoUrl = URL.createObjectURL(file);
  elements.videoPreview.src = videoUrl;
  elements.videoPreview.classList.remove('hidden');
  elements.imagePreview.classList.add('hidden');
  elements.previewPlaceholder.classList.add('hidden');
  elements.frameControls.classList.remove('hidden');
}

// ============================================================================
// CAMERA HANDLERS
// ============================================================================

async function handleOpenCamera() {
  if (state.mediaStream) return;
  
  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });
    
    elements.cameraView.classList.remove('hidden');
    elements.cameraFeed.srcObject = state.mediaStream;
  } catch (err) {
    console.error("Error accessing camera:", err);
    renderError(elements, "Could not access camera. Please check permissions.");
  }
}

function handleCloseCamera() {
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach(track => track.stop());
    state.mediaStream = null;
  }
  elements.cameraFeed.srcObject = null;
  elements.cameraView.classList.add('hidden');
}

function handleCapturePhoto() {
  const canvas = document.createElement('canvas');
  canvas.width = elements.cameraFeed.videoWidth;
  canvas.height = elements.cameraFeed.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(elements.cameraFeed, 0, 0, canvas.width, canvas.height);
  
  canvas.toBlob(blob => {
    if (blob) {
      const photoFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
      processImageFile(photoFile);
      handleCloseCamera();
    }
  }, 'image/jpeg', 0.8);
}

// ============================================================================
// FRAME EXTRACTION
// ============================================================================

async function handleExtractFrames() {
  if (!elements.videoPreview.src || elements.videoPreview.readyState < 2) {
    renderError(elements, "Video is not ready yet.");
    return;
  }

  renderLoadingState(elements, true, "Extracting frames...");
  
  const frameCount = parseInt(elements.frameSlider.value, 10);
  const duration = elements.videoPreview.duration;
  const interval = duration / frameCount;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = elements.videoPreview.videoWidth;
  canvas.height = elements.videoPreview.videoHeight;
  
  state.capturedFrames = [];

  for (let i = 0; i < frameCount; i++) {
    const time = i * interval;
    await new Promise(resolve => {
      const seekedListener = () => {
        elements.videoPreview.removeEventListener('seeked', seekedListener);
        ctx.drawImage(elements.videoPreview, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        state.capturedFrames.push({
          data: dataUrl.split(',')[1],
          mimeType: 'image/jpeg',
          src: dataUrl,
        });
        resolve();
      };
      elements.videoPreview.addEventListener('seeked', seekedListener, { once: true });
      elements.videoPreview.currentTime = time;
    });
  }
  
  renderLoadingState(elements, false);
  
  elements.videoPreview.classList.add('hidden');
  elements.frameControls.classList.add('hidden');
  elements.imagePreview.classList.remove('hidden');
  startPreviewAnimation();
  
  elements.generateBtn.textContent = 'Generate Stylized Video';
  elements.generateBtn.disabled = false;
}

// ============================================================================
// GENERATION
// ============================================================================

async function handleGenerate() {
  if (!state.ai) {
    renderError(elements, "API Key is missing. Please configure it in settings.");
    renderModal(elements, true);
    return;
  }

  if (state.capturedFrames.length === 0) {
    renderError(elements, 'Please upload an image or extract frames first.');
    return;
  }

  stopAnimations();
  
  if (state.capturedFrames.length === 1) {
    await generateSingleImage();
  } else {
    await processVideoWithProgressivePreview();
  }
}

async function generateSingleImage() {
  renderLoadingState(elements, true, "Applying artistic style...");

  try {
    const styledFrames = await styleFrames(state.capturedFrames, "Styling image");
    state.stylizedFrames = styledFrames;

    if (styledFrames.length === 0) {
      renderError(elements, 'The model did not return an image. Please try again.');
    } else {
      startOutputAnimation();
      state.downloadableUrl = styledFrames[0].src;
      state.downloadableFilename = `stylized-image-${Date.now()}.png`;
      elements.downloadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span>Download Frame</span>`;
      elements.downloadBtn.classList.remove('hidden');
    }
  } catch (error) {
    if (error.message !== "Invalid API Key") {
      console.error('API Error:', error);
      renderError(elements, 'Failed to generate image. Please check your connection and try again.');
    }
  } finally {
    renderLoadingState(elements, false);
  }
}

async function processVideoWithProgressivePreview() {
  // Low-res preview
  try {
    renderLoadingState(elements, true, "Generating low-quality preview...");
    const lowResFrames = await createLowResFrames(state.capturedFrames, 0.25);
    const styledLowResFrames = await styleFrames(lowResFrames, "Styling preview frame");

    if (styledLowResFrames.length === 0) {
      throw new Error("Preview generation failed.");
    }

    state.stylizedFrames = styledLowResFrames;
    startOutputAnimation();
  } catch (error) {
    if (error.message === "Invalid API Key") return;
    console.error("Failed to generate low-quality preview:", error);
    renderError(elements, "Could not generate a preview. Please try again.");
    renderLoadingState(elements, false);
    return;
  }

  // High-res final
  try {
    const styledHighResFrames = await styleFrames(state.capturedFrames, "Styling high-quality frame");

    if (styledHighResFrames.length !== state.capturedFrames.length) {
      renderError(elements, `Could not stylize all frames (${styledHighResFrames.length}/${state.capturedFrames.length}).`);
    }

    renderLoadingState(elements, true, "Encoding final video...");
    const { url, extension } = await createVideoFromFrames(styledHighResFrames, 10);

    stopAnimations();
    elements.generatedImageWrapper.classList.add('hidden');
    elements.outputPlaceholder.classList.add('hidden');
    
    elements.outputVideo.src = url;
    elements.outputVideo.classList.remove('hidden');

    state.downloadableUrl = url;
    state.downloadableFilename = `stylized-video-${Date.now()}.${extension}`;
    elements.downloadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span>Download Video</span>`;
    elements.downloadBtn.classList.remove('hidden');

  } catch (error) {
    if (error.message === "Invalid API Key") return;
    console.error('API Error during high-quality video generation:', error);
    renderError(elements, 'Failed to generate final video, but the preview is available.');
  } finally {
    renderLoadingState(elements, false);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function resetState() {
  stopAnimations();
  state.capturedFrames = [];
  state.stylizedFrames = [];
  elements.generateBtn.disabled = true;
  elements.imagePreview.classList.add('hidden');
  elements.videoPreview.classList.add('hidden');
  elements.frameControls.classList.add('hidden');
  
  if (elements.videoPreview.src) {
    URL.revokeObjectURL(elements.videoPreview.src);
    elements.videoPreview.src = '';
  }
  
  state.mediaType = 'none';
  state.downloadableUrl = null;
  state.downloadableFilename = '';
  elements.outputVideo.classList.add('hidden');
  
  if (elements.outputVideo.src) {
    URL.revokeObjectURL(elements.outputVideo.src);
    elements.outputVideo.src = '';
  }
  
  elements.generatedImageWrapper.classList.add('hidden');
  elements.downloadBtn.classList.add('hidden');
  elements.generateBtn.textContent = 'Apply Style';
}

function stopAnimations() {
  if (state.previewAnimationId) {
    clearInterval(state.previewAnimationId);
    state.previewAnimationId = null;
  }
  if (state.outputAnimationId) {
    clearInterval(state.outputAnimationId);
    state.outputAnimationId = null;
  }
}

function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve({
          mimeType: file.type,
          data: base64Data,
          src: reader.result
        });
      } else {
        reject(new Error('Failed to read file as string.'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function styleFrames(framesToStyle, loadingMessagePrefix = "Styling frame") {
  const selectedStyle = elements.styleSelect.value;
  const prompt = createStylePrompt(selectedStyle);
  const styledResults = [];

  for (let i = 0; i < framesToStyle.length; i++) {
    const frame = framesToStyle[i];
    renderLoadingState(elements, true, `${loadingMessagePrefix} ${i + 1} of ${framesToStyle.length}...`);
    
    const imagePart = { inlineData: { data: frame.data, mimeType: frame.mimeType } };
    const textPart = { text: prompt };
    
    try {
      const response = await state.ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [imagePart, textPart] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
      });

      const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part) {
        styledResults.push({ src: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
      } else {
        styledResults.push({ src: frame.src });
      }
    } catch (error) {
      console.error(`API error on frame ${i + 1}:`, error);
      
      if (error.toString().includes('403') || error.toString().includes('API_KEY_INVALID')) {
        renderError(elements, "API Key Invalid. Please check your settings.");
        localStorage.removeItem('gemini_api_key');
        renderModal(elements, true);
        throw new Error("Invalid API Key");
      }

      styledResults.push({ src: frame.src });
    }
  }

  return styledResults;
}

function createLowResFrames(highResFrames, scale) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  return Promise.all(highResFrames.map(frame => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        resolve({
          data: dataUrl.split(',')[1],
          mimeType: 'image/jpeg',
          src: dataUrl
        });
      };
      img.onerror = reject;
      img.src = frame.src;
    });
  }));
}

function createVideoFromFrames(frames, fps) {
  return new Promise((resolve, reject) => {
    if (!frames || frames.length === 0) {
      return reject(new Error("No frames to create video from."));
    }
    
    const firstFrameImg = new Image();
    firstFrameImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = firstFrameImg.width;
      canvas.height = firstFrameImg.height;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(fps);
      
      const videoOptions = [
        { mimeType: 'video/webm; codecs=vp9', extension: 'webm' },
        { mimeType: 'video/webm; codecs=vp8', extension: 'webm' },
        { mimeType: 'video/mp4', extension: 'mp4' },
        { mimeType: 'video/webm', extension: 'webm' },
      ];

      let recorder, selectedOptions;
      for (const options of videoOptions) {
        if (MediaRecorder.isTypeSupported(options.mimeType)) {
          try {
            recorder = new MediaRecorder(stream, { mimeType: options.mimeType });
            selectedOptions = options;
            break;
          } catch (e) {
            console.warn(`Failed to initialize MediaRecorder with ${options.mimeType}`, e);
          }
        }
      }
      
      if (!recorder) {
        return reject(new Error("MediaRecorder could not be initialized."));
      }

      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedOptions.mimeType });
        const url = URL.createObjectURL(blob);
        resolve({ url, extension: selectedOptions.extension });
      };
      recorder.onerror = reject;
      recorder.start();

      (async () => {
        for (const frame of frames) {
          await new Promise(res => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
              setTimeout(res, 1000 / fps);
            };
            img.onerror = () => {
              ctx.fillStyle = 'black';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              setTimeout(res, 1000 / fps);
            };
            img.src = frame.src;
          });
        }
        recorder.stop();
      })();
    };
    firstFrameImg.onerror = () => reject(new Error("Could not load first frame."));
    firstFrameImg.src = frames[0].src;
  });
}

function startPreviewAnimation() {
  if (state.previewAnimationId) clearInterval(state.previewAnimationId);
  let currentIndex = 0;
  state.previewAnimationId = setInterval(() => {
    if (state.capturedFrames.length > 0) {
      elements.imagePreview.src = state.capturedFrames[currentIndex].src;
      currentIndex = (currentIndex + 1) % state.capturedFrames.length;
    }
  }, 200);
}

function startOutputAnimation() {
  if (state.outputAnimationId) clearInterval(state.outputAnimationId);
  elements.outputPlaceholder.classList.add('hidden');
  elements.outputVideo.classList.add('hidden');
  
  if (elements.outputVideo.src) {
    URL.revokeObjectURL(elements.outputVideo.src);
    elements.outputVideo.src = '';
  }
  
  elements.generatedImageWrapper.classList.remove('hidden');

  if (state.stylizedFrames.length === 0) return;

  elements.generatedImageA.src = state.stylizedFrames[0].src;
  elements.generatedImageB.src = '';
  elements.generatedImageA.style.opacity = '1';
  elements.generatedImageB.style.opacity = '0';
  state.isImageAVisible = true;
  state.currentFrameIndex = 0;

  if (state.stylizedFrames.length <= 1) return;

  state.outputAnimationId = setInterval(() => {
    state.currentFrameIndex = (state.currentFrameIndex + 1) % state.stylizedFrames.length;

    const visibleImage = state.isImageAVisible ? elements.generatedImageA : elements.generatedImageB;
    const hiddenImage = state.isImageAVisible ? elements.generatedImageB : elements.generatedImageA;

    hiddenImage.onload = () => {
      visibleImage.style.opacity = '0';
      hiddenImage.style.opacity = '1';
      state.isImageAVisible = !state.isImageAVisible;
      hiddenImage.onload = null;
    };
    
    hiddenImage.src = state.stylizedFrames[state.currentFrameIndex].src;
  }, 400);
}

function handleDownload() {
  if (!state.downloadableUrl || !state.downloadableFilename) {
    renderError(elements, 'No file available to download.');
    return;
  }

  const link = document.createElement('a');
  link.href = state.downloadableUrl;
  link.download = state.downloadableFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
