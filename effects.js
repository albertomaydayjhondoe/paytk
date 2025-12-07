/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Effect Layer - Handles all side effects (IO, API calls, DOM manipulation)
 * Following functional programming principles with IO monad pattern
 */

import { GoogleGenAI, Modality } from "https://esm.sh/@google/genai@1.0.0";
import {
  createFrame,
  parseDataUrl,
  createStylePrompt,
  calculateFrameTimes,
  selectBestCodec
} from './functional-core.js';

// ============================================================================
// IO MONAD - Wraps side effects
// ============================================================================

/**
 * IO Monad for encapsulating side effects
 */
export class IO {
  constructor(effect) {
    this.effect = effect;
  }

  static of(value) {
    return new IO(() => value);
  }

  map(fn) {
    return new IO(() => fn(this.effect()));
  }

  flatMap(fn) {
    return new IO(() => fn(this.effect()).effect());
  }

  run() {
    return this.effect();
  }
}

// ============================================================================
// STORAGE EFFECTS - LocalStorage operations
// ============================================================================

/**
 * Gets API key from storage
 * @returns {IO<string | null>}
 */
export const getStoredApiKey = () =>
  new IO(() => localStorage.getItem('gemini_api_key'));

/**
 * Saves API key to storage
 * @param {string} key
 * @returns {IO<void>}
 */
export const saveApiKey = (key) =>
  new IO(() => localStorage.setItem('gemini_api_key', key));

/**
 * Removes API key from storage
 * @returns {IO<void>}
 */
export const removeApiKey = () =>
  new IO(() => localStorage.removeItem('gemini_api_key'));

// ============================================================================
// API EFFECTS - Gemini AI operations
// ============================================================================

/**
 * Initializes AI client
 * @param {string} apiKey
 * @returns {IO<GoogleGenAI>}
 */
export const initializeAI = (apiKey) =>
  new IO(() => new GoogleGenAI({ apiKey }));

/**
 * Generates content with Gemini API
 * @param {GoogleGenAI} ai
 * @param {Frame} frame
 * @param {string} prompt
 * @returns {IO<Promise<Frame>>}
 */
export const generateStylizedFrame = (ai, frame, prompt) =>
  new IO(async () => {
    const imagePart = {
      inlineData: { data: frame.data, mimeType: frame.mimeType }
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, textPart] },
      config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    
    if (!part) {
      throw new Error('No image returned from API');
    }

    return createFrame(part.inlineData.data, part.inlineData.mimeType);
  });

/**
 * Processes multiple frames with API
 * @param {GoogleGenAI} ai
 * @param {Frame[]} frames
 * @param {string} style
 * @param {(progress: number, total: number) => void} onProgress
 * @returns {IO<Promise<Frame[]>>}
 */
export const styleFramesBatch = (ai, frames, style, onProgress = () => {}) =>
  new IO(async () => {
    const prompt = createStylePrompt(style);
    const results = [];

    for (let i = 0; i < frames.length; i++) {
      onProgress(i + 1, frames.length);
      
      try {
        const styledFrame = await generateStylizedFrame(ai, frames[i], prompt).run();
        results.push({ success: true, frame: styledFrame });
      } catch (error) {
        console.error(`Failed to style frame ${i + 1}:`, error);
        // Use original frame as fallback
        results.push({ success: true, frame: frames[i] });
      }
    }

    return results.filter(r => r.success).map(r => r.frame);
  });

// ============================================================================
// FILE EFFECTS - File reading operations
// ============================================================================

/**
 * Converts File to Frame
 * @param {File} file
 * @returns {IO<Promise<Frame>>}
 */
export const fileToFrame = (file) =>
  new IO(() => new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const { data, mimeType } = parseDataUrl(reader.result);
        resolve(createFrame(data, mimeType));
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  }));

// ============================================================================
// MEDIA EFFECTS - Camera and video operations
// ============================================================================

/**
 * Gets user media stream
 * @param {MediaStreamConstraints} constraints
 * @returns {IO<Promise<MediaStream>>}
 */
export const getUserMedia = (constraints = { video: { facingMode: 'user' }, audio: false }) =>
  new IO(() => navigator.mediaDevices.getUserMedia(constraints));

/**
 * Stops media stream
 * @param {MediaStream} stream
 * @returns {IO<void>}
 */
export const stopMediaStream = (stream) =>
  new IO(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  });

/**
 * Captures frame from video element
 * @param {HTMLVideoElement} video
 * @returns {IO<Frame>}
 */
export const captureVideoFrame = (video) =>
  new IO(() => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const { data, mimeType } = parseDataUrl(dataUrl);
    
    return createFrame(data, mimeType);
  });

/**
 * Extracts frames from video at specific times
 * @param {HTMLVideoElement} video
 * @param {number[]} times
 * @returns {IO<Promise<Frame[]>>}
 */
export const extractFramesFromVideo = (video, times) =>
  new IO(async () => {
    const frames = [];
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    for (const time of times) {
      await new Promise((resolve) => {
        const seekedHandler = () => {
          video.removeEventListener('seeked', seekedHandler);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const { data, mimeType } = parseDataUrl(dataUrl);
          frames.push(createFrame(data, mimeType));
          resolve();
        };
        
        video.addEventListener('seeked', seekedHandler, { once: true });
        video.currentTime = time;
      });
    }

    return frames;
  });

/**
 * Scales down image for preview
 * @param {Frame} frame
 * @param {number} scale
 * @returns {IO<Promise<Frame>>}
 */
export const scaleFrame = (frame, scale) =>
  new IO(() => new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      const { data, mimeType } = parseDataUrl(dataUrl);
      resolve(createFrame(data, mimeType));
    };

    img.onerror = reject;
    img.src = frame.src;
  }));

/**
 * Creates video from frames using MediaRecorder
 * @param {Frame[]} frames
 * @param {number} fps
 * @returns {IO<Promise<{url: string, extension: string}>>}
 */
export const createVideoFromFrames = (frames, fps = 10) =>
  new IO(() => new Promise((resolve, reject) => {
    if (!frames || frames.length === 0) {
      return reject(new Error('No frames to create video'));
    }

    const firstImg = new Image();
    
    firstImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = firstImg.width;
      canvas.height = firstImg.height;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(fps);
      
      // Find supported codec
      const supportedTypes = [
        'video/webm; codecs=vp9',
        'video/webm; codecs=vp8',
        'video/mp4',
        'video/webm'
      ].filter(type => MediaRecorder.isTypeSupported(type));

      const codec = selectBestCodec(supportedTypes);
      
      if (!codec) {
        return reject(new Error('No supported video codec found'));
      }

      let recorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: codec.mimeType });
      } catch (e) {
        return reject(new Error('Failed to initialize MediaRecorder'));
      }

      const chunks = [];

      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: codec.mimeType });
        const url = URL.createObjectURL(blob);
        resolve({ url, extension: codec.extension });
      };
      recorder.onerror = reject;

      recorder.start();

      // Draw frames sequentially
      (async () => {
        for (const frame of frames) {
          await new Promise((res) => {
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

    firstImg.onerror = () => reject(new Error('Failed to load first frame'));
    firstImg.src = frames[0].src;
  }));

// ============================================================================
// BLOB EFFECTS - URL creation/revocation
// ============================================================================

/**
 * Creates object URL from blob
 * @param {Blob} blob
 * @returns {IO<string>}
 */
export const createObjectURL = (blob) =>
  new IO(() => URL.createObjectURL(blob));

/**
 * Revokes object URL
 * @param {string} url
 * @returns {IO<void>}
 */
export const revokeObjectURL = (url) =>
  new IO(() => {
    if (url) URL.revokeObjectURL(url);
  });

// ============================================================================
// SERVICE WORKER EFFECTS
// ============================================================================

/**
 * Registers service worker
 * @param {string} path
 * @returns {IO<Promise<ServiceWorkerRegistration>>}
 */
export const registerServiceWorker = (path = './sw.js') =>
  new IO(() => {
    if ('serviceWorker' in navigator) {
      return navigator.serviceWorker.register(path, { scope: './' });
    }
    return Promise.reject(new Error('Service workers not supported'));
  });

// ============================================================================
// DOWNLOAD EFFECT
// ============================================================================

/**
 * Triggers download of file
 * @param {string} url
 * @param {string} filename
 * @returns {IO<void>}
 */
export const downloadFile = (url, filename) =>
  new IO(() => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
