
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from "https://esm.sh/@google/genai@1.0.0";


// Register the service worker for PWA functionality
// Changed to relative path './sw.js' to support GitHub Pages sub-directories
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

// Global AI instance (initialized later)
let ai = null;

// DOM elements
const mediaUpload = document.getElementById('media-upload');
const uploadLabel = document.getElementById('upload-label');
const cameraBtn = document.getElementById('camera-btn');
const imagePreview = document.getElementById('image-preview');
const videoPreview = document.getElementById('video-preview');
const previewPlaceholder = document.getElementById('preview-placeholder');
const frameControls = document.getElementById('frame-controls');
const frameSlider = document.getElementById('frame-slider');
const frameCount = document.getElementById('frame-count');
const extractFramesBtn = document.getElementById('extract-frames-btn');
const styleSelect = document.getElementById('style-select');
const generateBtn = document.getElementById('generate-btn');
const loader = document.getElementById('loader');
const generatedImageWrapper = document.getElementById('generated-image-wrapper');
const generatedImageA = document.getElementById('generated-image-a');
const generatedImageB = document.getElementById('generated-image-b');
const outputVideo = document.getElementById('generated-video');
const outputPlaceholder = document.getElementById('output-placeholder');
const downloadBtn = document.getElementById('download-btn');

// Modal Elements
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const resetKeyBtn = document.getElementById('reset-key-btn');

// Camera view elements
const cameraView = document.getElementById('camera-view');
const cameraFeed = document.getElementById('camera-feed');
const cameraControls = document.getElementById('camera-controls');
const photoCaptureBtn = document.getElementById('photo-capture-btn');
const closeCameraBtn = document.getElementById('close-camera-btn');

// App state
let capturedFrames = [];
let stylizedFrames = [];
let previewAnimationInterval = null;
let outputAnimationInterval = null;
let currentStylizedFrameIndex = 0;
let isImageAVisible = true;
let mediaType = 'none'; // 'image' or 'video'
let downloadableUrl = null;
let downloadableFilename = '';


// Camera state
let mediaStream = null;


// Critical check to ensure all required elements are present.
const requiredElements = [
    mediaUpload, uploadLabel, cameraBtn, imagePreview, videoPreview, previewPlaceholder,
    frameControls, frameSlider, frameCount, extractFramesBtn, styleSelect, generateBtn,
    loader, generatedImageWrapper, generatedImageA, generatedImageB, outputVideo, outputPlaceholder,
    downloadBtn, cameraView, cameraFeed, cameraControls, photoCaptureBtn, closeCameraBtn,
    apiKeyModal, apiKeyInput, saveApiKeyBtn, resetKeyBtn
];

if (requiredElements.some(el => !el)) {
    console.error("Fatal Error: One or more essential DOM elements are missing.");
    document.body.innerHTML = "<h1>Error: Application could not start. Please contact support.</h1>";
} else {
    // Initialize API Key
    checkApiKey();

    // Add event listeners
    uploadLabel.addEventListener('click', () => mediaUpload.click());
    cameraBtn.addEventListener('click', openCamera);

    frameSlider.addEventListener('input', () => {
        frameCount.textContent = frameSlider.value;
    });

    mediaUpload.addEventListener('change', handleMediaUpload);
    extractFramesBtn.addEventListener('click', handleExtractFrames);
    generateBtn.addEventListener('click', handleGenerateClick);
    downloadBtn.addEventListener('click', handleDownloadClick);
    
    // Camera listeners
    closeCameraBtn.addEventListener('click', closeCamera);
    photoCaptureBtn.addEventListener('click', takePhoto);
    
    // API Key Listeners
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    resetKeyBtn.addEventListener('click', () => {
        localStorage.removeItem('gemini_api_key');
        window.location.reload();
    });
}

/**
 * Checks for API key in environment or local storage.
 * If not found, shows the modal.
 */
function checkApiKey() {
    const envKey = process.env.API_KEY;
    const storedKey = localStorage.getItem('gemini_api_key');
    
    // Check if the env key is the placeholder
    const isPlaceholder = !envKey || envKey === 'TU_API_KEY_AQUI';

    if (!isPlaceholder) {
        // Use hardcoded key from index.html
        initializeAI(envKey);
    } else if (storedKey) {
        // Use stored key
        initializeAI(storedKey);
    } else {
        // Show modal
        apiKeyModal.classList.remove('hidden');
    }
}

/**
 * Saves the API key from the modal input to local storage.
 */
function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (key.length > 0) {
        localStorage.setItem('gemini_api_key', key);
        initializeAI(key);
        apiKeyModal.classList.add('hidden');
    } else {
        alert("Please enter a valid API Key.");
    }
}

/**
 * Initializes the Gemini AI client.
 * @param {string} key The API Key.
 */
function initializeAI(key) {
    try {
        ai = new GoogleGenAI({ apiKey: key });
        console.log("Gemini AI initialized.");
    } catch (e) {
        console.error("Failed to initialize AI:", e);
        showError("Invalid API Key format.");
    }
}


/**
 * Resets the application state for animations and data.
 */
function resetState() {
    clearInterval(previewAnimationInterval);
    clearInterval(outputAnimationInterval);
    previewAnimationInterval = null;
    outputAnimationInterval = null;
    capturedFrames = [];
    stylizedFrames = [];
    generateBtn.disabled = true;
    imagePreview.classList.add('hidden');
    videoPreview.classList.add('hidden');
    frameControls.classList.add('hidden');
    if (videoPreview.src) {
        URL.revokeObjectURL(videoPreview.src);
        videoPreview.src = '';
    }
    mediaType = 'none';
    downloadableUrl = null;
    downloadableFilename = '';
    outputVideo.classList.add('hidden');
    if (outputVideo.src) {
        URL.revokeObjectURL(outputVideo.src);
        outputVideo.src = '';
    }
    generatedImageWrapper.classList.add('hidden');
    downloadBtn.classList.add('hidden');
    generateBtn.textContent = 'Apply Style';
}

/**
 * Converts a File object to a base64 encoded string.
 * @param {File} file The file to convert.
 * @returns {Promise<{mimeType: string, data: string}>}
 */
function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve({
          mimeType: file.type,
          data: base64Data,
        });
      } else {
        reject(new Error('Failed to read file as string.'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Handles file input change for both images and videos.
 */
function handleMediaUpload() {
    const file = mediaUpload.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
        processImageFile(file);
    } else if (file.type.startsWith('video/')) {
        processVideoFile(file);
    } else {
        showError("Unsupported file type. Please upload an image or video.");
    }
    mediaUpload.value = ''; // Reset input
}

/**
 * Processes an image file and updates the UI.
 * @param {File} file The image file to process.
 */
async function processImageFile(file) {
  if (!file) return;
  resetState();
  mediaType = 'image';
  generateBtn.textContent = 'Apply Style';
  try {
    const { data, mimeType } = await fileToGenerativePart(file);
    capturedFrames = [{ data, mimeType, src: `data:${mimeType};base64,${data}` }];

    imagePreview.src = capturedFrames[0].src;
    imagePreview.classList.remove('hidden');
    previewPlaceholder.classList.add('hidden');
    generateBtn.disabled = false;
  } catch (error) {
    console.error('Error processing file:', error);
    showError('Could not process the uploaded file.');
  }
}

/**
 * Processes a video file and updates the UI.
 * @param {File} file The video file to process.
 */
function processVideoFile(file) {
    if (!file) return;
    resetState();
    mediaType = 'video';
    const videoUrl = URL.createObjectURL(file);
    videoPreview.src = videoUrl;
    videoPreview.classList.remove('hidden');
    previewPlaceholder.classList.add('hidden');
    frameControls.classList.remove('hidden');
}


/**
 * Opens the camera view and starts the media stream.
 */
async function openCamera() {
    if (mediaStream) return;
    try {
        // Prefer user-facing camera and no audio for photos
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });
    } catch (err) {
        console.error("Error accessing camera:", err);
        showError("Could not access camera. Please check permissions.");
        return;
    }
    cameraView.classList.remove('hidden');
    cameraFeed.srcObject = mediaStream;
}

/**
 * Closes the camera view and stops the media stream.
 */
function closeCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    mediaStream = null;
    cameraFeed.srcObject = null;
    cameraView.classList.add('hidden');
}

/**
 * Captures a photo from the camera feed.
 */
function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(blob => {
        if (blob) {
            const photoFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
            processImageFile(photoFile);
            closeCamera();
        }
    }, 'image/jpeg', 0.8);
}

/**
 * Extracts frames from the video preview.
 */
async function handleExtractFrames() {
    if (!videoPreview.src || videoPreview.readyState < 2) { // HAVE_CURRENT_DATA
        showError("Video is not ready yet.");
        return;
    }

    setLoading(true, "Extracting frames...");
    
    const frameCountVal = parseInt(frameSlider.value, 10);
    const duration = videoPreview.duration;
    const interval = duration / frameCountVal;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = videoPreview.videoWidth;
    canvas.height = videoPreview.videoHeight;
    
    capturedFrames = [];

    const capturePromises = [];

    for (let i = 0; i < frameCountVal; i++) {
        const time = i * interval;
        capturePromises.push(new Promise(resolve => {
            const seekedListener = () => {
                videoPreview.removeEventListener('seeked', seekedListener);
                ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                capturedFrames.push({
                    data: dataUrl.split(',')[1],
                    mimeType: 'image/jpeg',
                    src: dataUrl,
                });
                resolve();
            };
            videoPreview.addEventListener('seeked', seekedListener, { once: true });
            videoPreview.currentTime = time;
        }));
    }

    await Promise.all(capturePromises);
    
    setLoading(false);
    
    videoPreview.classList.add('hidden');
    frameControls.classList.add('hidden');
    imagePreview.classList.remove('hidden');
    startPreviewAnimation();
    
    generateBtn.textContent = 'Generate Stylized Video';
    generateBtn.disabled = false;
}

/**
 * Starts the animation for the captured frames preview.
 */
function startPreviewAnimation() {
    if (previewAnimationInterval) clearInterval(previewAnimationInterval);
    let currentIndex = 0;
    previewAnimationInterval = setInterval(() => {
        if (capturedFrames.length > 0) {
            imagePreview.src = capturedFrames[currentIndex].src;
            currentIndex = (currentIndex + 1) % capturedFrames.length;
        }
    }, 200); // 5 frames per second
}

/**
 * Shows an error message in the output container.
 * @param {string} message The error message to display.
 */
function showError(message) {
    outputPlaceholder.textContent = `Error: ${message}`;
    outputPlaceholder.style.color = 'var(--error-color)';
    outputPlaceholder.classList.remove('hidden');
    generatedImageWrapper.classList.add('hidden');
    outputVideo.classList.add('hidden');
    downloadBtn.classList.add('hidden');
}

/**
 * Main dispatcher for the "Generate" button click.
 */
async function handleGenerateClick() {
  if (!ai) {
    showError("API Key is missing. Please configure it in settings.");
    apiKeyModal.classList.remove('hidden');
    return;
  }

  if (capturedFrames.length === 0) {
    showError('Please upload an image or extract frames first.');
    return;
  }

  clearInterval(previewAnimationInterval);
  clearInterval(outputAnimationInterval);
  
  if (capturedFrames.length === 1) {
    await generateSingleImage();
  } else {
    await processVideoWithProgressivePreview();
  }
}

/**
 * Applies a style to an array of frames by calling the Gemini API.
 * @param {Array<object>} framesToStyle - The frames to process.
 * @param {string} loadingMessagePrefix - The message to show while loading.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of stylized frames.
 */
async function styleFrames(framesToStyle, loadingMessagePrefix = "Styling frame") {
    const selectedStyle = styleSelect.value;
    const prompt = `Transform this image into a ${selectedStyle} style.`;
    const styledResults = [];

    // Process frames sequentially to avoid hitting API rate limits.
    for (let i = 0; i < framesToStyle.length; i++) {
        const frame = framesToStyle[i];
        setLoading(true, `${loadingMessagePrefix} ${i + 1} of ${framesToStyle.length}...`);
        
        const imagePart = { inlineData: { data: frame.data, mimeType: frame.mimeType } };
        const textPart = { text: prompt };
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [imagePart, textPart] },
                config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
            });
    
            const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (part) {
                styledResults.push({ src: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
            } else {
                // Fallback to original frame if model doesn't return an image
                console.warn(`Styling failed for frame ${i + 1}. Using original frame as fallback.`);
                styledResults.push({ src: frame.src });
            }
        } catch (error) {
            // Fallback to original frame on API error
            console.error(`API error on frame ${i + 1}:`, error);
            
            // Check for 403 (invalid key)
            if (error.toString().includes('403') || error.toString().includes('API_KEY_INVALID')) {
                 showError("API Key Invalid. Please check your settings.");
                 localStorage.removeItem('gemini_api_key');
                 apiKeyModal.classList.remove('hidden');
                 throw new Error("Invalid API Key"); // Stop processing
            }

            console.warn(`Using original frame as fallback.`);
            styledResults.push({ src: frame.src });
        }
    }

    return styledResults;
}

/**
 * Handles styling for a single image.
 */
async function generateSingleImage() {
  setLoading(true, "Applying artistic style...");

  try {
    const styledResults = await styleFrames(capturedFrames, "Styling image");
    stylizedFrames = styledResults;

    if (stylizedFrames.length === 0) {
        showError('The model did not return an image. Please try again.');
    } else {
        startOutputAnimation();
        downloadableUrl = stylizedFrames[0].src;
        downloadableFilename = `stylized-image-${Date.now()}.png`;
        downloadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span>Download Frame</span>`;
        downloadBtn.classList.remove('hidden');
    }
  } catch (error) {
    if (error.message !== "Invalid API Key") {
        console.error('API Error:', error);
        showError('Failed to generate image. Please check your connection and try again.');
    }
  } finally {
    setLoading(false);
  }
}

/**
 * Creates low-resolution versions of frames for a quick preview.
 * @param {Array<object>} highResFrames - The original high-resolution frames.
 * @param {number} scale - The scaling factor (e.g., 0.25 for 25% size).
 * @returns {Promise<Array<object>>} A promise that resolves to an array of low-res frame objects.
 */
function createLowResFrames(highResFrames, scale) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const conversionPromises = highResFrames.map(frame => {
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
    });

    return Promise.all(conversionPromises);
}

/**
 * Handles video generation with a two-pass progressive enhancement (low-res preview then hi-res final).
 */
async function processVideoWithProgressivePreview() {
    // --- PASS 1: LOW QUALITY PREVIEW ---
    try {
        setLoading(true, "Generating low-quality preview...");
        const lowResFrames = await createLowResFrames(capturedFrames, 0.25);
        const styledLowResFrames = await styleFrames(lowResFrames, "Styling preview frame");

        if (styledLowResFrames.length === 0) {
            throw new Error("Preview generation failed. No frames were returned.");
        }

        stylizedFrames = styledLowResFrames;
        startOutputAnimation(); // Show the low-res animated preview
    } catch (error) {
        if (error.message === "Invalid API Key") return;
        console.error("Failed to generate low-quality preview:", error);
        showError("Could not generate a preview. Please try again.");
        setLoading(false);
        return; // Stop here if preview fails
    }

    // --- PASS 2: HIGH QUALITY VIDEO ---
    // The low-res preview is now playing. We continue in the background.
    try {
        const styledHighResFrames = await styleFrames(capturedFrames, "Styling high-quality frame");

        if (styledHighResFrames.length !== capturedFrames.length) {
            // This case should be less likely now with the fallback, but kept for safety.
            showError(`Could not stylize all high-quality frames (${styledHighResFrames.length}/${capturedFrames.length} succeeded). Video will be generated with available frames.`);
        }

        setLoading(true, "Encoding final video...");
        const { url: videoBlobUrl, extension } = await createVideoFromFrames(styledHighResFrames, 10);

        // --- FINAL DISPLAY ---
        clearInterval(outputAnimationInterval);
        outputAnimationInterval = null;
        generatedImageWrapper.classList.add('hidden');
        outputPlaceholder.classList.add('hidden');
        
        outputVideo.src = videoBlobUrl;
        outputVideo.classList.remove('hidden');

        downloadableUrl = videoBlobUrl;
        downloadableFilename = `stylized-video-${Date.now()}.${extension}`;
        downloadBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg><span>Download Video</span>`;
        downloadBtn.classList.remove('hidden');

    } catch (error) {
        if (error.message === "Invalid API Key") return;
        console.error('API Error during high-quality video generation:', error);
        showError('Failed to generate final video, but the preview is available.');
    } finally {
        setLoading(false);
    }
}


/**
 * Creates a video from a series of image frames using Canvas and MediaRecorder.
 * This function is now more robust, trying multiple codecs to ensure browser compatibility.
 * @param {Array<{src: string}>} frames - Array of image frames with data URLs.
 * @param {number} fps - Frames per second for the output video.
 * @returns {Promise<{url: string, extension: string}>} A promise that resolves with the object URL of the video blob and the file extension.
 */
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
            let recorder;
            let selectedOptions;

            const videoOptions = [
                { mimeType: 'video/webm; codecs=vp9', extension: 'webm' },
                { mimeType: 'video/webm; codecs=vp8', extension: 'webm' },
                { mimeType: 'video/mp4', extension: 'mp4' },
                { mimeType: 'video/webm', extension: 'webm' },
            ];

            for (const options of videoOptions) {
                if (MediaRecorder.isTypeSupported(options.mimeType)) {
                    try {
                        recorder = new MediaRecorder(stream, { mimeType: options.mimeType });
                        selectedOptions = options;
                        console.log(`Using MediaRecorder with options:`, options);
                        break;
                    } catch (e) {
                        console.warn(`Failed to initialize MediaRecorder with ${options.mimeType}`, e);
                    }
                }
            }
            
            if (!recorder) {
                return reject(new Error("MediaRecorder could not be initialized. Cannot create video."));
            }

            const chunks = [];

            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: selectedOptions.mimeType });
                const url = URL.createObjectURL(blob);
                resolve({ url, extension: selectedOptions.extension });
            };
            recorder.onerror = e => reject(e);
            recorder.start();

            (async () => {
                for (const frame of frames) {
                    await new Promise(res => {
                        const img = new Image();
                        img.onload = () => {
                            ctx.drawImage(img, 0, 0);
                            res();
                        };
                        img.onerror = () => {
                            // Draw a black frame if an image fails to load
                            console.warn("A frame failed to load, inserting black frame.");
                            ctx.fillStyle = 'black';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            res();
                        };
                        img.src = frame.src;
                    });
                }
                recorder.stop();
            })();
        };
        firstFrameImg.onerror = () => reject(new Error("Could not load first frame to get video dimensions."));
        firstFrameImg.src = frames[0].src;
    });
}


/**
 * Starts the cross-fade animation for the stylized output frames.
 */
function startOutputAnimation() {
    if (outputAnimationInterval) clearInterval(outputAnimationInterval);
    outputPlaceholder.classList.add('hidden');
    outputVideo.classList.add('hidden');
    if (outputVideo.src) {
        URL.revokeObjectURL(outputVideo.src);
        outputVideo.src = '';
    }
    generatedImageWrapper.classList.remove('hidden');

    if (stylizedFrames.length === 0) return;

    generatedImageA.src = stylizedFrames[0].src;
    generatedImageB.src = '';
    generatedImageA.style.opacity = '1';
    generatedImageB.style.opacity = '0';
    isImageAVisible = true;
    currentStylizedFrameIndex = 0;

    if (stylizedFrames.length <= 1) {
        return;
    }

    outputAnimationInterval = setInterval(() => {
        currentStylizedFrameIndex = (currentStylizedFrameIndex + 1) % stylizedFrames.length;

        const visibleImage = isImageAVisible ? generatedImageA : generatedImageB;
        const hiddenImage = isImageAVisible ? generatedImageB : generatedImageA;

        hiddenImage.onload = () => {
            visibleImage.style.opacity = '0';
            hiddenImage.style.opacity = '1';
            isImageAVisible = !isImageAVisible;
            hiddenImage.onload = null;
        };
        
        hiddenImage.src = stylizedFrames[currentStylizedFrameIndex].src;
        
    }, 400); // 2.5fps with cross-fade
}

/**
 * Toggles the loading state of the UI.
 * @param {boolean} isLoading Whether the UI should be in a loading state.
 * @param {string} [message='Loading...'] The message to display.
 */
function setLoading(isLoading, message = 'Loading...') {
    generateBtn.disabled = isLoading;
    cameraBtn.disabled = isLoading;
    extractFramesBtn.disabled = isLoading;

    if (isLoading) {
        uploadLabel.setAttribute('aria-disabled', 'true');
    } else {
        uploadLabel.removeAttribute('aria-disabled');
    }

    if (isLoading) {
        loader.classList.remove('hidden');
        // Don't hide the preview while loading the HD version
        if (!outputAnimationInterval) {
            generatedImageWrapper.classList.add('hidden');
            outputVideo.classList.add('hidden');
        }
        outputPlaceholder.textContent = message;
        outputPlaceholder.classList.remove('hidden');
        outputPlaceholder.style.color = 'var(--text-color)';
    } else {
        loader.classList.add('hidden');
    }
}

/**
 * Handles the download button click event. Downloads the final generated image or video.
 */
function handleDownloadClick() {
    if (!downloadableUrl || !downloadableFilename) {
        showError('No file available to download.');
        return;
    }

    // This function now robustly handles downloading the final output,
    // whether it's a single image or a complete video file.
    const link = document.createElement('a');
    link.href = downloadableUrl;
    link.download = downloadableFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
