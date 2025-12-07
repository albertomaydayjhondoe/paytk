/**
 * Media Style Transfer - Gemini AI
 * SOLO IMÁGENES - Sin videos
 */

import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.0.0';

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/paytk/sw.js', { scope: '/paytk/' })
      .then(reg => console.log('✅ ServiceWorker registered'))
      .catch(err => console.log('❌ ServiceWorker failed:', err));
  });
}

// DOM Elements
const mediaUpload = document.getElementById('media-upload');
const uploadLabel = document.getElementById('upload-label');
const cameraBtn = document.getElementById('camera-btn');
const imagePreview = document.getElementById('image-preview');
const styleSelect = document.getElementById('style-select');
const generateBtn = document.getElementById('generate-btn');
const loader = document.getElementById('loader');
const generatedImageA = document.getElementById('generated-image-a');
const generatedImageWrapper = document.getElementById('generated-image-wrapper');
const outputPlaceholder = document.getElementById('output-placeholder');
const downloadBtn = document.getElementById('download-btn');
const cameraView = document.getElementById('camera-view');
const cameraFeed = document.getElementById('camera-feed');
const photoCaptureBtn = document.getElementById('photo-capture-btn');
const closeCameraBtn = document.getElementById('close-camera-btn');
const apiKeyModal = document.getElementById('api-key-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveApiKeyBtn = document.getElementById('save-api-key-btn');
const skipApiKeyBtn = document.getElementById('skip-api-key-btn');
const apiKeyError = document.getElementById('api-key-error');
const resetKeyBtn = document.getElementById('reset-key-btn');

// State
let currentImage = null;
let stylizedImage = null;
let mediaStream = null;
let ai = null;
let apiKey = null;

// Style prompts
const stylePrompts = {
    'Pencil Sketch': 'Transform this image into a detailed pencil sketch with visible pencil strokes and shading',
    'Watercolor Painting': 'Transform this image into a watercolor painting with soft colors and brush strokes',
    'Oil Painting': 'Transform this image into an oil painting with thick brush strokes and vibrant colors',
    'Charcoal Drawing': 'Transform this image into a charcoal drawing with strong contrasts',
    'Anime / Manga': 'Transform this image into anime/manga art style with bold outlines',
    'Pop Art': 'Transform this image into pop art style like Andy Warhol with bold colors',
    'Steampunk': 'Transform this image into steampunk style with Victorian industrial aesthetics',
    'Cubism': 'Transform this image into cubist art style like Picasso',
    'Impressionism': 'Transform this image into impressionist style like Monet',
    'Surrealism': 'Transform this image into surrealist art like Salvador Dali',
    'Art Nouveau': 'Transform this image into Art Nouveau style with flowing lines',
    'Gothic': 'Transform this image into gothic art with dark atmosphere'
};

// Initialize
window.addEventListener('load', () => {
    checkApiKey();
});

// Check API Key
function checkApiKey() {
    const defaultKey = import.meta.env.VITE_GEMINI_API_KEY;
    apiKey = localStorage.getItem('gemini_api_key');
    
    if (!apiKey && defaultKey) {
        apiKey = defaultKey;
        console.log('✅ Using default API Key');
    }
    
    if (apiKey) {
        try {
            ai = new GoogleGenAI({ apiKey });
            apiKeyModal.classList.add('hidden');
            console.log('✅ API Key loaded');
        } catch (error) {
            console.error('❌ Invalid API key');
            showApiKeyModal();
        }
    } else {
        showApiKeyModal();
    }
}

function showApiKeyModal() {
    apiKeyModal.classList.remove('hidden');
    apiKeyInput.value = '';
    apiKeyError.classList.add('hidden');
}

function hideApiKeyModal() {
    apiKeyModal.classList.add('hidden');
}

async function saveApiKey() {
    const key = apiKeyInput.value.trim();
    
    if (!key) {
        showApiKeyError('Por favor ingresa una API key');
        return;
    }
    
    setLoading(true, 'Verificando API key...');
    
    try {
        const testAi = new GoogleGenAI({ apiKey: key });
        const model = testAi.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        await model.generateContent('Hello');
        
        apiKey = key;
        ai = testAi;
        localStorage.setItem('gemini_api_key', key);
        hideApiKeyModal();
        setLoading(false);
        console.log('✅ API Key saved');
    } catch (error) {
        console.error('❌ API Key invalid:', error);
        showApiKeyError('API key inválida');
        setLoading(false);
    }
}

function showApiKeyError(message) {
    apiKeyError.textContent = message;
    apiKeyError.classList.remove('hidden');
}

function resetApiKey() {
    localStorage.removeItem('gemini_api_key');
    apiKey = null;
    ai = null;
    showApiKeyModal();
}

function skipApiKeyModal() {
    const defaultKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (defaultKey) {
        apiKey = defaultKey;
        ai = new GoogleGenAI({ apiKey });
        hideApiKeyModal();
        console.log('✅ Using default key');
    } else {
        showApiKeyError('No hay API key por defecto');
    }
}

// Event Listeners
uploadLabel.addEventListener('click', () => mediaUpload.click());
mediaUpload.addEventListener('change', handleMediaUpload);
cameraBtn.addEventListener('click', openCamera);
generateBtn.addEventListener('click', applyStyle);
downloadBtn.addEventListener('click', downloadImage);
closeCameraBtn.addEventListener('click', closeCamera);
photoCaptureBtn.addEventListener('click', takePhoto);
saveApiKeyBtn.addEventListener('click', saveApiKey);
if (skipApiKeyBtn) skipApiKeyBtn.addEventListener('click', skipApiKeyModal);
if (resetKeyBtn) resetKeyBtn.addEventListener('click', resetApiKey);

apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveApiKey();
});

// File Upload
function handleMediaUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Por favor sube solo imágenes');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => loadImage(e.target.result);
    reader.readAsDataURL(file);
    mediaUpload.value = '';
}

function loadImage(src) {
    currentImage = src;
    imagePreview.src = src;
    imagePreview.classList.remove('hidden');
    document.getElementById('preview-placeholder').classList.add('hidden');
    generateBtn.disabled = false;
    
    generatedImageWrapper.classList.add('hidden');
    outputPlaceholder.classList.remove('hidden');
    downloadBtn.classList.add('hidden');
    stylizedImage = null;
}

// Camera
async function openCamera() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        cameraFeed.srcObject = mediaStream;
        cameraView.classList.remove('hidden');
    } catch (error) {
        alert('No se pudo acceder a la cámara: ' + error.message);
    }
}

function closeCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    cameraView.classList.add('hidden');
}

function takePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraFeed, 0, 0);
    
    const src = canvas.toDataURL('image/jpeg', 0.95);
    loadImage(src);
    closeCamera();
}

// Apply AI Style
async function applyStyle() {
    if (!currentImage) {
        alert('Por favor sube una imagen primero');
        return;
    }
    
    if (!ai) {
        alert('Por favor configura tu API key primero');
        showApiKeyModal();
        return;
    }
    
    const selectedStyle = styleSelect.value;
    const prompt = stylePrompts[selectedStyle];
    
    setLoading(true, `Aplicando estilo ${selectedStyle}...`);
    
    try {
        console.log('🎨 Generando con Gemini AI...');
        
        const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        
        const base64Data = currentImage.split(',')[1];
        const mimeType = currentImage.match(/^data:([^;]+);/)[1];
        
        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType
                }
            },
            prompt
        ]);
        
        const response = await result.response;
        const imageData = response.candidates[0].content.parts[0].inlineData;
        
        if (imageData) {
            stylizedImage = `data:${imageData.mimeType};base64,${imageData.data}`;
            generatedImageA.src = stylizedImage;
            generatedImageWrapper.classList.remove('hidden');
            outputPlaceholder.classList.add('hidden');
            downloadBtn.classList.remove('hidden');
            console.log('✅ Estilo aplicado!');
        } else {
            throw new Error('No se recibió imagen de Gemini');
        }
        
        setLoading(false);
    } catch (error) {
        console.error('❌ Error:', error);
        
        let errorMsg = 'Error al aplicar el filtro. ';
        
        if (error.message.includes('API key')) {
            errorMsg += 'API key inválida.';
            resetApiKey();
        } else if (error.message.includes('quota')) {
            errorMsg += 'Límite de cuota alcanzado.';
        } else if (error.message.includes('not available')) {
            errorMsg += 'Servicio no disponible en tu región.';
        } else {
            errorMsg += error.message;
        }
        
        alert(errorMsg);
        setLoading(false);
    }
}

// Download
function downloadImage() {
    if (!stylizedImage) return;
    
    const link = document.createElement('a');
    link.href = stylizedImage;
    link.download = `gemini-${styleSelect.value.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    link.click();
}

// UI Helpers
function setLoading(isLoading, message = "Procesando...") {
    if (isLoading) {
        loader.innerHTML = `<div class="spinner"></div><p>${message}</p>`;
        loader.classList.remove('hidden');
        generateBtn.disabled = true;
    } else {
        loader.classList.add('hidden');
        generateBtn.disabled = false;
    }
}

console.log('✅ Gemini AI App Ready!');
