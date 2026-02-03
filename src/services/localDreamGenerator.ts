import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import {
  ImageGenerationParams,
  ImageGenerationProgress,
  GeneratedImage,
} from '../types';
import RNFS from 'react-native-fs';

const { LocalDreamModule } = NativeModules;

type ProgressCallback = (progress: ImageGenerationProgress) => void;
type PreviewCallback = (preview: { previewPath: string; step: number; totalSteps: number }) => void;
type CompleteCallback = (image: GeneratedImage) => void;
type ErrorCallback = (error: Error) => void;

/**
 * LocalDream-based image generator service.
 * Replaces ONNX Runtime with local-dream's subprocess HTTP server.
 *
 * The native module (LocalDreamModule) manages:
 * - Server process lifecycle (spawn/kill)
 * - HTTP POST + SSE parsing for image generation
 * - RGB→PNG conversion and file management
 *
 * Progress events are emitted via NativeEventEmitter from the native side.
 */
class LocalDreamGeneratorService {
  private loadedThreads: number | null = null;
  private generating = false;
  private eventEmitter: NativeEventEmitter | null = null;

  private getEmitter(): NativeEventEmitter {
    if (!this.eventEmitter) {
      this.eventEmitter = new NativeEventEmitter(LocalDreamModule);
    }
    return this.eventEmitter;
  }

  private async findFileRecursive(dir: string, fileName: string, maxDepth: number): Promise<boolean> {
    if (maxDepth <= 0) return false;
    try {
      if (await RNFS.exists(`${dir}/${fileName}`)) return true;
      const items = await RNFS.readDir(dir);
      for (const item of items) {
        if (item.isDirectory()) {
          if (await this.findFileRecursive(item.path, fileName, maxDepth - 1)) return true;
        }
      }
    } catch { /* ignore */ }
    return false;
  }

  isAvailable(): boolean {
    return Platform.OS === 'android' && LocalDreamModule != null;
  }

  async isModelLoaded(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      return await LocalDreamModule.isModelLoaded();
    } catch {
      return false;
    }
  }

  async getLoadedModelPath(): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      return await LocalDreamModule.getLoadedModelPath();
    } catch {
      return null;
    }
  }

  async loadModel(modelPath: string, threads?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('LocalDream image generation is not available on this platform');
    }

    // Detect backend from model files
    // If unet.mnn exists -> CPU/MNN backend, otherwise -> QNN/NPU backend
    // Search recursively since zip extraction may create nested directories
    let backend = 'mnn';
    try {
      const foundMnn = await this.findFileRecursive(modelPath, 'unet.mnn', 3);
      if (!foundMnn) {
        backend = 'qnn';
      }
    } catch {
      // Default to mnn if we can't check
    }

    const params: { modelPath: string; threads?: number; backend: string } = {
      modelPath,
      backend,
    };
    if (typeof threads === 'number') {
      params.threads = threads;
    }

    const result = await LocalDreamModule.loadModel(params);
    this.loadedThreads = typeof threads === 'number' ? threads : this.loadedThreads;
    return result;
  }

  getLoadedThreads(): number | null {
    return this.loadedThreads;
  }

  async unloadModel(): Promise<boolean> {
    if (!this.isAvailable()) return true;
    const result = await LocalDreamModule.unloadModel();
    this.loadedThreads = null;
    return result;
  }

  async generateImage(
    params: ImageGenerationParams & { previewInterval?: number },
    onProgress?: ProgressCallback,
    onPreview?: PreviewCallback,
    onComplete?: CompleteCallback,
    onError?: ErrorCallback
  ): Promise<GeneratedImage> {
    if (!this.isAvailable()) {
      throw new Error('LocalDream image generation is not available on this platform');
    }

    if (this.generating) {
      throw new Error('Image generation already in progress');
    }

    this.generating = true;

    // Subscribe to native progress events (includes both progress and preview data)
    let progressSubscription: any = null;
    progressSubscription = this.getEmitter().addListener(
      'LocalDreamProgress',
      (event: { step: number; totalSteps: number; progress: number; previewPath?: string }) => {
        onProgress?.({
          step: event.step,
          totalSteps: event.totalSteps,
          progress: event.progress,
        });

        // Forward preview image if present
        if (event.previewPath && onPreview) {
          onPreview({
            previewPath: event.previewPath,
            step: event.step,
            totalSteps: event.totalSteps,
          });
        }
      }
    );

    try {
      // Call native generateImage — handles HTTP POST, SSE parsing, and PNG saving
      const result = await LocalDreamModule.generateImage({
        prompt: params.prompt,
        negativePrompt: params.negativePrompt || '',
        steps: params.steps || 20,
        guidanceScale: params.guidanceScale || 7.5,
        seed: params.seed ?? Math.floor(Math.random() * 2147483647),
        width: params.width || 512,
        height: params.height || 512,
        previewInterval: params.previewInterval ?? 2,
      });

      const generatedImage: GeneratedImage = {
        id: result.id,
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        imagePath: result.imagePath,
        width: result.width,
        height: result.height,
        steps: params.steps || 20,
        seed: result.seed,
        modelId: '',
        createdAt: Date.now().toString(),
      };

      onComplete?.(generatedImage);
      return generatedImage;
    } catch (e: any) {
      const error = e instanceof Error ? e : new Error(String(e));
      onError?.(error);
      throw error;
    } finally {
      this.generating = false;
      progressSubscription?.remove();
    }
  }

  async cancelGeneration(): Promise<boolean> {
    if (!this.isAvailable()) return true;
    this.generating = false;
    return await LocalDreamModule.cancelGeneration();
  }

  async isGenerating(): Promise<boolean> {
    return this.generating;
  }

  async getGeneratedImages(): Promise<GeneratedImage[]> {
    if (!this.isAvailable()) return [];
    try {
      const images = await LocalDreamModule.getGeneratedImages();
      return images.map((img: any) => ({
        id: img.id,
        prompt: img.prompt || '',
        imagePath: img.imagePath,
        width: img.width || 512,
        height: img.height || 512,
        steps: img.steps || 20,
        seed: img.seed || 0,
        modelId: img.modelId || '',
        createdAt: img.createdAt,
      }));
    } catch {
      return [];
    }
  }

  async deleteGeneratedImage(imageId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    return await LocalDreamModule.deleteGeneratedImage(imageId);
  }

  getConstants() {
    if (!this.isAvailable()) {
      return {
        DEFAULT_STEPS: 20,
        DEFAULT_GUIDANCE_SCALE: 7.5,
        DEFAULT_WIDTH: 512,
        DEFAULT_HEIGHT: 512,
        SUPPORTED_WIDTHS: [128, 192, 256, 320, 384, 448, 512],
        SUPPORTED_HEIGHTS: [128, 192, 256, 320, 384, 448, 512],
      };
    }
    return LocalDreamModule.getConstants();
  }
}

export const localDreamGeneratorService = new LocalDreamGeneratorService();
