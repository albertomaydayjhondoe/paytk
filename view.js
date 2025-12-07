/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 * 
 * View Layer - Pure rendering functions following functional principles
 * All DOM updates are declarative and based on state
 */

// ============================================================================
// DOM QUERY FUNCTIONS - Get references to DOM elements
// ============================================================================

export const getDOMElements = () => ({
  // Upload controls
  mediaUpload: document.getElementById('media-upload'),
  uploadLabel: document.getElementById('upload-label'),
  cameraBtn: document.getElementById('camera-btn'),
  
  // Preview elements
  imagePreview: document.getElementById('image-preview'),
  videoPreview: document.getElementById('video-preview'),
  previewPlaceholder: document.getElementById('preview-placeholder'),
  
  // Frame controls
  frameControls: document.getElementById('frame-controls'),
  frameSlider: document.getElementById('frame-slider'),
  frameCount: document.getElementById('frame-count'),
  extractFramesBtn: document.getElementById('extract-frames-btn'),
  
  // Style controls
  styleSelect: document.getElementById('style-select'),
  generateBtn: document.getElementById('generate-btn'),
  
  // Output elements
  loader: document.getElementById('loader'),
  generatedImageWrapper: document.getElementById('generated-image-wrapper'),
  generatedImageA: document.getElementById('generated-image-a'),
  generatedImageB: document.getElementById('generated-image-b'),
  outputVideo: document.getElementById('generated-video'),
  outputPlaceholder: document.getElementById('output-placeholder'),
  downloadBtn: document.getElementById('download-btn'),
  
  // Modal elements
  apiKeyModal: document.getElementById('api-key-modal'),
  apiKeyInput: document.getElementById('api-key-input'),
  saveApiKeyBtn: document.getElementById('save-api-key-btn'),
  resetKeyBtn: document.getElementById('reset-key-btn'),
  
  // Camera elements
  cameraView: document.getElementById('camera-view'),
  cameraFeed: document.getElementById('camera-feed'),
  cameraControls: document.getElementById('camera-controls'),
  photoCaptureBtn: document.getElementById('photo-capture-btn'),
  closeCameraBtn: document.getElementById('close-camera-btn'),
});

// ============================================================================
// CLASS MANIPULATION - Pure functions for class management
// ============================================================================

/**
 * Adds class to element
 * @param {HTMLElement} element
 * @param {string} className
 */
export const addClass = (element, className) => {
  if (element) element.classList.add(className);
};

/**
 * Removes class from element
 * @param {HTMLElement} element
 * @param {string} className
 */
export const removeClass = (element, className) => {
  if (element) element.classList.remove(className);
};

/**
 * Toggles class on element
 * @param {HTMLElement} element
 * @param {string} className
 * @param {boolean} force
 */
export const toggleClass = (element, className, force) => {
  if (element) element.classList.toggle(className, force);
};

/**
 * Shows element by removing 'hidden' class
 * @param {HTMLElement} element
 */
export const show = (element) => removeClass(element, 'hidden');

/**
 * Hides element by adding 'hidden' class
 * @param {HTMLElement} element
 */
export const hide = (element) => addClass(element, 'hidden');

// ============================================================================
// ATTRIBUTE MANIPULATION
// ============================================================================

/**
 * Sets element attribute
 * @param {HTMLElement} element
 * @param {string} attr
 * @param {string} value
 */
export const setAttribute = (element, attr, value) => {
  if (element) element.setAttribute(attr, value);
};

/**
 * Removes element attribute
 * @param {HTMLElement} element
 * @param {string} attr
 */
export const removeAttribute = (element, attr) => {
  if (element) element.removeAttribute(attr);
};

/**
 * Sets element disabled state
 * @param {HTMLElement} element
 * @param {boolean} disabled
 */
export const setDisabled = (element, disabled) => {
  if (element) {
    element.disabled = disabled;
    if (disabled) {
      setAttribute(element, 'aria-disabled', 'true');
    } else {
      removeAttribute(element, 'aria-disabled');
    }
  }
};

// ============================================================================
// CONTENT MANIPULATION
// ============================================================================

/**
 * Sets element text content
 * @param {HTMLElement} element
 * @param {string} text
 */
export const setText = (element, text) => {
  if (element) element.textContent = text;
};

/**
 * Sets element HTML content
 * @param {HTMLElement} element
 * @param {string} html
 */
export const setHTML = (element, html) => {
  if (element) element.innerHTML = html;
};

/**
 * Sets element src attribute
 * @param {HTMLElement} element
 * @param {string} src
 */
export const setSrc = (element, src) => {
  if (element) element.src = src;
};

/**
 * Sets element value
 * @param {HTMLElement} element
 * @param {string} value
 */
export const setValue = (element, value) => {
  if (element) element.value = value;
};

/**
 * Sets element style property
 * @param {HTMLElement} element
 * @param {string} property
 * @param {string} value
 */
export const setStyle = (element, property, value) => {
  if (element) element.style[property] = value;
};

// ============================================================================
// VIEW RENDERING FUNCTIONS - Declarative UI updates
// ============================================================================

/**
 * Renders loading state
 * @param {Object} elements - DOM elements
 * @param {boolean} isLoading
 * @param {string} message
 */
export const renderLoadingState = (elements, isLoading, message = 'Loading...') => {
  const { loader, outputPlaceholder, generateBtn, cameraBtn, extractFramesBtn, uploadLabel } = elements;
  
  setDisabled(generateBtn, isLoading);
  setDisabled(cameraBtn, isLoading);
  setDisabled(extractFramesBtn, isLoading);
  
  if (isLoading) {
    setAttribute(uploadLabel, 'aria-disabled', 'true');
    show(loader);
    setText(outputPlaceholder, message);
    show(outputPlaceholder);
    setStyle(outputPlaceholder, 'color', 'var(--text-color)');
  } else {
    removeAttribute(uploadLabel, 'aria-disabled');
    hide(loader);
  }
};

/**
 * Renders error state
 * @param {Object} elements
 * @param {string} errorMessage
 */
export const renderError = (elements, errorMessage) => {
  const { outputPlaceholder, generatedImageWrapper, outputVideo, downloadBtn } = elements;
  
  setText(outputPlaceholder, `Error: ${errorMessage}`);
  setStyle(outputPlaceholder, 'color', 'var(--error-color)');
  show(outputPlaceholder);
  hide(generatedImageWrapper);
  hide(outputVideo);
  hide(downloadBtn);
};

/**
 * Renders API key modal
 * @param {Object} elements
 * @param {boolean} visible
 */
export const renderModal = (elements, visible) => {
  const { apiKeyModal } = elements;
  toggleClass(apiKeyModal, 'hidden', !visible);
};

/**
 * Renders camera view
 * @param {Object} elements
 * @param {boolean} visible
 * @param {MediaStream | null} stream
 */
export const renderCameraView = (elements, visible, stream = null) => {
  const { cameraView, cameraFeed } = elements;
  
  toggleClass(cameraView, 'hidden', !visible);
  if (visible && stream) {
    cameraFeed.srcObject = stream;
  } else {
    cameraFeed.srcObject = null;
  }
};

/**
 * Renders image preview
 * @param {Object} elements
 * @param {string} src
 */
export const renderImagePreview = (elements, src) => {
  const { imagePreview, videoPreview, previewPlaceholder, frameControls } = elements;
  
  setSrc(imagePreview, src);
  show(imagePreview);
  hide(videoPreview);
  hide(previewPlaceholder);
  hide(frameControls);
};

/**
 * Renders video preview
 * @param {Object} elements
 * @param {string} src
 */
export const renderVideoPreview = (elements, src) => {
  const { imagePreview, videoPreview, previewPlaceholder, frameControls } = elements;
  
  setSrc(videoPreview, src);
  show(videoPreview);
  hide(imagePreview);
  hide(previewPlaceholder);
  show(frameControls);
};

/**
 * Renders frame controls
 * @param {Object} elements
 * @param {number} frameCount
 */
export const renderFrameControls = (elements, frameCount) => {
  const { frameCount: frameCountEl, frameSlider } = elements;
  setText(frameCountEl, String(frameCount));
  setValue(frameSlider, String(frameCount));
};

/**
 * Renders generate button text
 * @param {Object} elements
 * @param {string} text
 * @param {boolean} enabled
 */
export const renderGenerateButton = (elements, text, enabled) => {
  const { generateBtn } = elements;
  setText(generateBtn, text);
  setDisabled(generateBtn, !enabled);
};

/**
 * Renders single stylized image
 * @param {Object} elements
 * @param {string} src
 */
export const renderStylizedImage = (elements, src) => {
  const { generatedImageWrapper, generatedImageA, generatedImageB, outputVideo, outputPlaceholder } = elements;
  
  setSrc(generatedImageA, src);
  setSrc(generatedImageB, '');
  setStyle(generatedImageA, 'opacity', '1');
  setStyle(generatedImageB, 'opacity', '0');
  
  show(generatedImageWrapper);
  hide(outputVideo);
  hide(outputPlaceholder);
};

/**
 * Renders output video
 * @param {Object} elements
 * @param {string} src
 */
export const renderOutputVideo = (elements, src) => {
  const { outputVideo, generatedImageWrapper, outputPlaceholder } = elements;
  
  setSrc(outputVideo, src);
  show(outputVideo);
  hide(generatedImageWrapper);
  hide(outputPlaceholder);
};

/**
 * Renders download button
 * @param {Object} elements
 * @param {boolean} visible
 * @param {string} label
 */
export const renderDownloadButton = (elements, visible, label = 'Download') => {
  const { downloadBtn } = elements;
  
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>';
  setHTML(downloadBtn, `${svg}<span>${label}</span>`);
  toggleClass(downloadBtn, 'hidden', !visible);
};

/**
 * Clears preview area
 * @param {Object} elements
 */
export const clearPreview = (elements) => {
  const { imagePreview, videoPreview, previewPlaceholder, frameControls } = elements;
  
  hide(imagePreview);
  hide(videoPreview);
  hide(frameControls);
  show(previewPlaceholder);
  setSrc(imagePreview, '');
  setSrc(videoPreview, '');
};

/**
 * Clears output area
 * @param {Object} elements
 */
export const clearOutput = (elements) => {
  const { generatedImageWrapper, outputVideo, downloadBtn, outputPlaceholder } = elements;
  
  hide(generatedImageWrapper);
  hide(outputVideo);
  hide(downloadBtn);
  setText(outputPlaceholder, 'Your stylized image will appear here.');
  setStyle(outputPlaceholder, 'color', '#888');
  show(outputPlaceholder);
};

/**
 * Resets entire UI to initial state
 * @param {Object} elements
 */
export const resetUI = (elements) => {
  clearPreview(elements);
  clearOutput(elements);
  renderGenerateButton(elements, 'Apply Style', false);
  renderLoadingState(elements, false);
};

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

/**
 * Creates crossfade animation between two images
 * @param {HTMLElement} visibleImage
 * @param {HTMLElement} hiddenImage
 * @param {string} newSrc
 * @param {Function} onComplete
 */
export const crossfadeImages = (visibleImage, hiddenImage, newSrc, onComplete) => {
  hiddenImage.onload = () => {
    setStyle(visibleImage, 'opacity', '0');
    setStyle(hiddenImage, 'opacity', '1');
    if (onComplete) onComplete();
    hiddenImage.onload = null;
  };
  setSrc(hiddenImage, newSrc);
};

// ============================================================================
// EVENT LISTENER HELPERS - Pure functions that return listener configs
// ============================================================================

/**
 * Creates event listener configuration
 * @param {string} event
 * @param {Function} handler
 * @param {Object} options
 * @returns {{event: string, handler: Function, options: Object}}
 */
export const createListener = (event, handler, options = {}) => ({
  event,
  handler,
  options
});

/**
 * Attaches event listeners to element
 * @param {HTMLElement} element
 * @param {Array<{event: string, handler: Function, options: Object}>} listeners
 */
export const attachListeners = (element, listeners) => {
  listeners.forEach(({ event, handler, options }) => {
    if (element) element.addEventListener(event, handler, options);
  });
};

/**
 * Detaches event listeners from element
 * @param {HTMLElement} element
 * @param {Array<{event: string, handler: Function, options: Object}>} listeners
 */
export const detachListeners = (element, listeners) => {
  listeners.forEach(({ event, handler, options }) => {
    if (element) element.removeEventListener(event, handler, options);
  });
};
