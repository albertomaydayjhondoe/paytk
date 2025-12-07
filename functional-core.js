/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Functional Core - Pure functions with no side effects
 * Perspectivista Architecture: Separating pure logic from effects
 */

// ============================================================================
// TYPE DEFINITIONS (using JSDoc)
// ============================================================================

/**
 * @typedef {Object} Frame
 * @property {string} data - Base64 encoded image data
 * @property {string} mimeType - MIME type of the image
 * @property {string} src - Data URL of the image
 */

/**
 * @typedef {Object} AppState
 * @property {Frame[]} capturedFrames
 * @property {Frame[]} stylizedFrames
 * @property {'none' | 'image' | 'video'} mediaType
 * @property {string | null} downloadableUrl
 * @property {string} downloadableFilename
 * @property {boolean} isLoading
 * @property {string} loadingMessage
 * @property {number} currentFrameIndex
 * @property {string | null} error
 */

/**
 * @typedef {Object} UIState
 * @property {boolean} showModal
 * @property {boolean} showCamera
 * @property {boolean} showFrameControls
 * @property {number} frameCount
 * @property {string} selectedStyle
 */

// ============================================================================
// PURE FUNCTIONS - No side effects, deterministic
// ============================================================================

/**
 * Creates initial application state
 * @returns {AppState}
 */
export const createInitialState = () => ({
  capturedFrames: [],
  stylizedFrames: [],
  mediaType: 'none',
  downloadableUrl: null,
  downloadableFilename: '',
  isLoading: false,
  loadingMessage: '',
  currentFrameIndex: 0,
  error: null
});

/**
 * Creates initial UI state
 * @returns {UIState}
 */
export const createInitialUIState = () => ({
  showModal: false,
  showCamera: false,
  showFrameControls: false,
  frameCount: 10,
  selectedStyle: 'Pencil Sketch'
});

/**
 * Updates state immutably
 * @template T
 * @param {T} state - Current state
 * @param {Partial<T>} updates - Updates to apply
 * @returns {T} New state
 */
export const updateState = (state, updates) => ({
  ...state,
  ...updates
});

/**
 * Sets loading state
 * @param {AppState} state
 * @param {boolean} isLoading
 * @param {string} message
 * @returns {AppState}
 */
export const setLoadingState = (state, isLoading, message = 'Loading...') =>
  updateState(state, {
    isLoading,
    loadingMessage: message,
    error: null
  });

/**
 * Sets error state
 * @param {AppState} state
 * @param {string} errorMessage
 * @returns {AppState}
 */
export const setErrorState = (state, errorMessage) =>
  updateState(state, {
    error: errorMessage,
    isLoading: false
  });

/**
 * Resets state to initial values
 * @param {AppState} state
 * @returns {AppState}
 */
export const resetAppState = (state) => ({
  ...createInitialState(),
  // Preserve certain properties if needed
});

/**
 * Adds captured frames to state
 * @param {AppState} state
 * @param {Frame[]} frames
 * @param {'image' | 'video'} mediaType
 * @returns {AppState}
 */
export const addCapturedFrames = (state, frames, mediaType) =>
  updateState(state, {
    capturedFrames: frames,
    mediaType,
    error: null
  });

/**
 * Adds stylized frames to state
 * @param {AppState} state
 * @param {Frame[]} frames
 * @returns {AppState}
 */
export const addStylizedFrames = (state, frames) =>
  updateState(state, {
    stylizedFrames: frames
  });

/**
 * Sets downloadable content
 * @param {AppState} state
 * @param {string} url
 * @param {string} filename
 * @returns {AppState}
 */
export const setDownloadable = (state, url, filename) =>
  updateState(state, {
    downloadableUrl: url,
    downloadableFilename: filename
  });

/**
 * Advances frame index (for animation)
 * @param {AppState} state
 * @returns {AppState}
 */
export const nextFrameIndex = (state) => {
  const maxIndex = Math.max(state.stylizedFrames.length, state.capturedFrames.length);
  if (maxIndex === 0) return state;
  
  return updateState(state, {
    currentFrameIndex: (state.currentFrameIndex + 1) % maxIndex
  });
};

// ============================================================================
// VALIDATION FUNCTIONS - Pure predicates
// ============================================================================

/**
 * Checks if API key is valid format
 * @param {string} key
 * @returns {boolean}
 */
export const isValidApiKey = (key) =>
  typeof key === 'string' && key.length > 10 && key.startsWith('AIza');

/**
 * Checks if file is an image
 * @param {File} file
 * @returns {boolean}
 */
export const isImageFile = (file) =>
  file && file.type.startsWith('image/');

/**
 * Checks if file is a video
 * @param {File} file
 * @returns {boolean}
 */
export const isVideoFile = (file) =>
  file && file.type.startsWith('video/');

/**
 * Checks if state has frames ready
 * @param {AppState} state
 * @returns {boolean}
 */
export const hasFrames = (state) =>
  state.capturedFrames.length > 0;

/**
 * Checks if state is ready to generate
 * @param {AppState} state
 * @returns {boolean}
 */
export const canGenerate = (state) =>
  hasFrames(state) && !state.isLoading && !state.error;

// ============================================================================
// DATA TRANSFORMATION FUNCTIONS - Pure transformations
// ============================================================================

/**
 * Parses base64 data URL
 * @param {string} dataUrl
 * @returns {{mimeType: string, data: string}}
 */
export const parseDataUrl = (dataUrl) => {
  const [header, data] = dataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  return { mimeType, data };
};

/**
 * Creates data URL from parts
 * @param {string} mimeType
 * @param {string} data
 * @returns {string}
 */
export const createDataUrl = (mimeType, data) =>
  `data:${mimeType};base64,${data}`;

/**
 * Creates a frame object
 * @param {string} data - Base64 data
 * @param {string} mimeType
 * @returns {Frame}
 */
export const createFrame = (data, mimeType) => ({
  data,
  mimeType,
  src: createDataUrl(mimeType, data)
});

/**
 * Generates filename for download
 * @param {'image' | 'video'} type
 * @param {string} extension
 * @returns {string}
 */
export const generateFilename = (type, extension) =>
  `stylized-${type}-${Date.now()}.${extension}`;

/**
 * Creates style prompt
 * @param {string} style
 * @returns {string}
 */
export const createStylePrompt = (style) =>
  `Transform this image into a ${style} style.`;

/**
 * Extracts successful frames from results (filtering out errors)
 * @param {Array<{success: boolean, frame?: Frame}>} results
 * @returns {Frame[]}
 */
export const extractSuccessfulFrames = (results) =>
  results
    .filter(r => r.success && r.frame)
    .map(r => r.frame);

/**
 * Calculates frame extraction times for video
 * @param {number} duration - Video duration in seconds
 * @param {number} frameCount - Number of frames to extract
 * @returns {number[]} Array of time points in seconds
 */
export const calculateFrameTimes = (duration, frameCount) =>
  Array.from({ length: frameCount }, (_, i) => (i * duration) / frameCount);

/**
 * Determines best video codec options
 * @param {string[]} supportedTypes
 * @returns {{mimeType: string, extension: string} | null}
 */
export const selectBestCodec = (supportedTypes) => {
  const codecOptions = [
    { mimeType: 'video/webm; codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm; codecs=vp8', extension: 'webm' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];

  return codecOptions.find(option => supportedTypes.includes(option.mimeType)) || null;
};

// ============================================================================
// COMPOSITION HELPERS - Function combinators
// ============================================================================

/**
 * Composes functions right to left
 * @template T
 * @param {...Function} fns
 * @returns {Function}
 */
export const compose = (...fns) =>
  (x) => fns.reduceRight((acc, fn) => fn(acc), x);

/**
 * Pipes functions left to right
 * @template T
 * @param {...Function} fns
 * @returns {Function}
 */
export const pipe = (...fns) =>
  (x) => fns.reduce((acc, fn) => fn(acc), x);

/**
 * Maps over array with a function
 * @template T, R
 * @param {(item: T) => R} fn
 * @returns {(arr: T[]) => R[]}
 */
export const map = (fn) => (arr) => arr.map(fn);

/**
 * Filters array with predicate
 * @template T
 * @param {(item: T) => boolean} predicate
 * @returns {(arr: T[]) => T[]}
 */
export const filter = (predicate) => (arr) => arr.filter(predicate);

/**
 * Creates a safe version of a function that returns Result type
 * @template T, R
 * @param {(arg: T) => R} fn
 * @returns {(arg: T) => {success: boolean, value?: R, error?: Error}}
 */
export const tryCatch = (fn) => (arg) => {
  try {
    return { success: true, value: fn(arg) };
  } catch (error) {
    return { success: false, error };
  }
};

// ============================================================================
// HIGHER ORDER FUNCTIONS - Function generators
// ============================================================================

/**
 * Creates a state updater function
 * @template T
 * @param {(state: T, payload: any) => T} updateFn
 * @returns {Function}
 */
export const createUpdater = (updateFn) =>
  (getState, setState) =>
    (payload) => {
      const currentState = getState();
      const newState = updateFn(currentState, payload);
      setState(newState);
      return newState;
    };

/**
 * Creates a memoized function
 * @template T, R
 * @param {(arg: T) => R} fn
 * @returns {(arg: T) => R}
 */
export const memoize = (fn) => {
  const cache = new Map();
  return (arg) => {
    const key = JSON.stringify(arg);
    if (cache.has(key)) return cache.get(key);
    const result = fn(arg);
    cache.set(key, result);
    return result;
  };
};

/**
 * Debounces a function
 * @template T
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttles a function
 * @template T
 * @param {Function} fn
 * @param {number} limit
 * @returns {Function}
 */
export const throttle = (fn, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
