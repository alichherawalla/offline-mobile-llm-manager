/**
 * ActiveModelService - Singleton for managing active models throughout the app
 * Provides a unified interface for accessing and controlling loaded models
 */

import { llmService } from './llm';
import { onnxImageGeneratorService } from './onnxImageGenerator';
import { modelManager } from './modelManager';
import { hardwareService } from './hardware';
import { useAppStore } from '../stores';
import { DownloadedModel, ONNXImageModel } from '../types';

export type ModelType = 'text' | 'image';

export interface ActiveModelInfo {
  text: {
    model: DownloadedModel | null;
    isLoaded: boolean;
    isLoading: boolean;
  };
  image: {
    model: ONNXImageModel | null;
    isLoaded: boolean;
    isLoading: boolean;
  };
}

export interface ResourceUsage {
  memoryUsed: number;
  memoryTotal: number;
  memoryAvailable: number;
  memoryUsagePercent: number;
}

type ModelChangeListener = (info: ActiveModelInfo) => void;

class ActiveModelService {
  private listeners: Set<ModelChangeListener> = new Set();
  private loadingState = {
    text: false,
    image: false,
  };

  /**
   * Get current active model info
   */
  getActiveModels(): ActiveModelInfo {
    const store = useAppStore.getState();
    const textModel = store.downloadedModels.find(m => m.id === store.activeModelId) || null;
    const imageModel = store.downloadedImageModels.find(m => m.id === store.activeImageModelId) || null;

    return {
      text: {
        model: textModel,
        isLoaded: llmService.isModelLoaded(),
        isLoading: this.loadingState.text,
      },
      image: {
        model: imageModel,
        isLoaded: !!store.activeImageModelId,
        isLoading: this.loadingState.image,
      },
    };
  }

  /**
   * Check if any model is currently loaded
   */
  hasAnyModelLoaded(): boolean {
    const info = this.getActiveModels();
    return info.text.isLoaded || info.image.isLoaded;
  }

  /**
   * Load a text model
   */
  async loadTextModel(modelId: string): Promise<void> {
    const store = useAppStore.getState();
    const model = store.downloadedModels.find(m => m.id === modelId);
    if (!model) throw new Error('Model not found');

    this.loadingState.text = true;
    this.notifyListeners();

    try {
      await llmService.loadModel(model.filePath, model.mmProjPath);
      store.setActiveModelId(modelId);
    } finally {
      this.loadingState.text = false;
      this.notifyListeners();
    }
  }

  /**
   * Unload the current text model
   */
  async unloadTextModel(): Promise<void> {
    this.loadingState.text = true;
    this.notifyListeners();

    try {
      await llmService.unloadModel();
      useAppStore.getState().setActiveModelId(null);
    } finally {
      this.loadingState.text = false;
      this.notifyListeners();
    }
  }

  /**
   * Load an image model
   */
  async loadImageModel(modelId: string): Promise<void> {
    const store = useAppStore.getState();
    const model = store.downloadedImageModels.find(m => m.id === modelId);
    if (!model) throw new Error('Model not found');

    this.loadingState.image = true;
    this.notifyListeners();

    try {
      await onnxImageGeneratorService.loadModel(model.modelPath);
      store.setActiveImageModelId(modelId);
    } finally {
      this.loadingState.image = false;
      this.notifyListeners();
    }
  }

  /**
   * Unload the current image model
   */
  async unloadImageModel(): Promise<void> {
    this.loadingState.image = true;
    this.notifyListeners();

    try {
      await onnxImageGeneratorService.unloadModel();
      useAppStore.getState().setActiveImageModelId(null);
    } finally {
      this.loadingState.image = false;
      this.notifyListeners();
    }
  }

  /**
   * Unload all models (eject all)
   */
  async unloadAllModels(): Promise<{ textUnloaded: boolean; imageUnloaded: boolean }> {
    const info = this.getActiveModels();
    const results = { textUnloaded: false, imageUnloaded: false };

    const promises: Promise<void>[] = [];

    if (info.text.isLoaded) {
      promises.push(
        this.unloadTextModel().then(() => {
          results.textUnloaded = true;
        })
      );
    }

    if (info.image.isLoaded) {
      promises.push(
        this.unloadImageModel().then(() => {
          results.imageUnloaded = true;
        })
      );
    }

    await Promise.all(promises);
    return results;
  }

  /**
   * Get current resource usage
   */
  async getResourceUsage(): Promise<ResourceUsage> {
    const info = await hardwareService.refreshMemoryInfo();
    const usagePercent = ((info.usedMemory / info.totalMemory) * 100);

    return {
      memoryUsed: info.usedMemory,
      memoryTotal: info.totalMemory,
      memoryAvailable: info.availableMemory,
      memoryUsagePercent: usagePercent,
    };
  }

  /**
   * Get LLM performance stats (tokens/sec)
   */
  getPerformanceStats() {
    return llmService.getPerformanceStats();
  }

  /**
   * Subscribe to model changes
   */
  subscribe(listener: ModelChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const info = this.getActiveModels();
    this.listeners.forEach(listener => listener(info));
  }
}

export const activeModelService = new ActiveModelService();
