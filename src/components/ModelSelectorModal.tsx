import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS } from '../constants';
import { useAppStore } from '../stores';
import { DownloadedModel } from '../types';
import { onnxImageGeneratorService } from '../services';

interface ModelSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectModel: (model: DownloadedModel) => void;
  onUnloadModel: () => void;
  onUnloadImageModel?: () => void;
  isLoading: boolean;
  currentModelPath: string | null;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  visible,
  onClose,
  onSelectModel,
  onUnloadModel,
  onUnloadImageModel,
  isLoading,
  currentModelPath,
}) => {
  const { downloadedModels, downloadedImageModels, activeImageModelId, setActiveImageModelId } = useAppStore();
  const hasLoadedModel = currentModelPath !== null;
  const [imageModelLoaded, setImageModelLoaded] = useState(false);
  const [imageModelPath, setImageModelPath] = useState<string | null>(null);
  const [isUnloadingImage, setIsUnloadingImage] = useState(false);

  // Check image model loaded state when modal opens
  useEffect(() => {
    if (visible) {
      checkImageModelState();
    }
  }, [visible]);

  const checkImageModelState = async () => {
    const loaded = await onnxImageGeneratorService.isModelLoaded();
    const path = await onnxImageGeneratorService.getLoadedModelPath();
    setImageModelLoaded(loaded);
    setImageModelPath(path);
  };

  const handleUnloadImageModel = async () => {
    setIsUnloadingImage(true);
    try {
      await onnxImageGeneratorService.unloadModel();
      setImageModelLoaded(false);
      setImageModelPath(null);
      onUnloadImageModel?.();
    } catch (error) {
      console.error('Failed to unload image model:', error);
    } finally {
      setIsUnloadingImage(false);
    }
  };

  const activeImageModel = downloadedImageModels.find(m => m.id === activeImageModelId);
  const loadedImageModel = downloadedImageModels.find(m => m.modelPath === imageModelPath);

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const getQuantInfo = (model: DownloadedModel): string => {
    // Extract quantization info from model name or filename
    const name = model.name.toLowerCase();
    if (name.includes('q4_k_m')) return 'Q4_K_M';
    if (name.includes('q4_k_s')) return 'Q4_K_S';
    if (name.includes('q5_k_m')) return 'Q5_K_M';
    if (name.includes('q5_k_s')) return 'Q5_K_S';
    if (name.includes('q8_0')) return 'Q8_0';
    if (name.includes('q6_k')) return 'Q6_K';
    if (name.includes('q3_k')) return 'Q3_K';
    if (name.includes('q2_k')) return 'Q2_K';
    if (name.includes('f16')) return 'F16';
    if (name.includes('f32')) return 'F32';
    return '';
  };

  const isCurrentModel = (model: DownloadedModel): boolean => {
    return currentModelPath === model.filePath;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modal} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Model</Text>
            <TouchableOpacity onPress={onClose} disabled={isLoading}>
              <Text style={[styles.closeButton, isLoading && styles.disabled]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={styles.loadingBanner}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading model...</Text>
            </View>
          )}

          <ScrollView style={styles.content}>
            {/* Loaded Models Section */}
            {(hasLoadedModel || imageModelLoaded) && (
              <View style={styles.loadedSection}>
                <Text style={styles.sectionTitle}>Currently Loaded</Text>

                {/* Text Model */}
                {hasLoadedModel && (
                  <View style={styles.loadedModelItem}>
                    <View style={styles.loadedModelIcon}>
                      <Icon name="message-square" size={18} color={COLORS.primary} />
                    </View>
                    <View style={styles.loadedModelInfo}>
                      <Text style={styles.loadedModelType}>Text Model</Text>
                      <Text style={styles.loadedModelName} numberOfLines={1}>
                        {downloadedModels.find(m => m.filePath === currentModelPath)?.name || 'Unknown'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.unloadIconButton}
                      onPress={onUnloadModel}
                      disabled={isLoading}
                    >
                      <Icon name="x" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Image Model */}
                {imageModelLoaded && (
                  <View style={styles.loadedModelItem}>
                    <View style={[styles.loadedModelIcon, { backgroundColor: COLORS.secondary + '20' }]}>
                      <Icon name="image" size={18} color={COLORS.secondary} />
                    </View>
                    <View style={styles.loadedModelInfo}>
                      <Text style={styles.loadedModelType}>Image Model</Text>
                      <Text style={styles.loadedModelName} numberOfLines={1}>
                        {loadedImageModel?.name || activeImageModel?.name || 'Unknown'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.unloadIconButton}
                      onPress={handleUnloadImageModel}
                      disabled={isUnloadingImage}
                    >
                      {isUnloadingImage ? (
                        <ActivityIndicator size="small" color={COLORS.error} />
                      ) : (
                        <Icon name="x" size={18} color={COLORS.error} />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Text Models Section Title */}
            <Text style={styles.sectionTitle}>Text Models</Text>

            {downloadedModels.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>No Models Downloaded</Text>
                <Text style={styles.emptyText}>
                  Go to the Models screen to download a model first.
                </Text>
              </View>
            ) : (
              downloadedModels.map((model) => {
                const isCurrent = isCurrentModel(model);
                const quantInfo = getQuantInfo(model);

                return (
                  <TouchableOpacity
                    key={model.id}
                    style={[
                      styles.modelItem,
                      isCurrent && styles.modelItemSelected,
                    ]}
                    onPress={() => onSelectModel(model)}
                    disabled={isLoading}
                  >
                    <View style={styles.modelInfo}>
                      <Text
                        style={[
                          styles.modelName,
                          isCurrent && styles.modelNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {model.name}
                      </Text>
                      <View style={styles.modelMeta}>
                        <Text style={styles.modelSize}>
                          {formatSize(model.fileSize + (model.mmProjFileSize || 0))}
                        </Text>
                        {(quantInfo || model.quantization) && (
                          <>
                            <Text style={styles.metaSeparator}>•</Text>
                            <Text style={styles.modelQuant}>
                              {quantInfo || model.quantization}
                            </Text>
                          </>
                        )}
                        {model.isVisionModel && (
                          <>
                            <Text style={styles.metaSeparator}>•</Text>
                            <Text style={styles.visionBadge}>Vision</Text>
                          </>
                        )}
                      </View>
                    </View>
                    {isCurrent && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '20',
    paddingVertical: 10,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
  },
  modelItemSelected: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  modelNameSelected: {
    color: COLORS.primary,
  },
  modelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelSize: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  metaSeparator: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginHorizontal: 6,
  },
  modelQuant: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  visionBadge: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '600',
    backgroundColor: COLORS.secondary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  unloadButton: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.warning,
    alignItems: 'center',
  },
  unloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  unloadButtonHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  loadedSection: {
    marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadedModelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  loadedModelIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  loadedModelInfo: {
    flex: 1,
  },
  loadedModelType: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  loadedModelName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  unloadIconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
