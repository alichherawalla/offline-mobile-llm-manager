import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '../components';
import { CustomAlert, showAlert, hideAlert, AlertState, initialAlertState } from '../components/CustomAlert';
import { COLORS, TYPOGRAPHY, FONTS } from '../constants';
import { authService } from '../services/authService';
import { useAuthStore } from '../stores/authStore';

interface PassphraseSetupScreenProps {
  isChanging?: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export const PassphraseSetupScreen: React.FC<PassphraseSetupScreenProps> = ({
  isChanging = false,
  onComplete,
  onCancel,
}) => {
  const [currentPassphrase, setCurrentPassphrase] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>(initialAlertState);

  const { setEnabled } = useAuthStore();

  const validatePassphrase = (passphrase: string): string | null => {
    if (passphrase.length < 6) {
      return 'Passphrase must be at least 6 characters';
    }
    if (passphrase.length > 50) {
      return 'Passphrase must be 50 characters or less';
    }
    return null;
  };

  const handleSubmit = async () => {
    // Validate new passphrase
    const error = validatePassphrase(newPassphrase);
    if (error) {
      setAlertState(showAlert('Invalid Passphrase', error));
      return;
    }

    // Check confirmation matches
    if (newPassphrase !== confirmPassphrase) {
      setAlertState(showAlert('Mismatch', 'Passphrases do not match'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (isChanging) {
        // Verify current passphrase and change
        const success = await authService.changePassphrase(currentPassphrase, newPassphrase);
        if (!success) {
          setAlertState(showAlert('Error', 'Current passphrase is incorrect'));
          setIsSubmitting(false);
          return;
        }
        setAlertState(showAlert('Success', 'Passphrase changed successfully'));
      } else {
        // Set new passphrase
        const success = await authService.setPassphrase(newPassphrase);
        if (!success) {
          setAlertState(showAlert('Error', 'Failed to set passphrase'));
          setIsSubmitting(false);
          return;
        }
        setEnabled(true);
        setAlertState(showAlert('Success', 'Passphrase lock enabled'));
      }

      onComplete();
    } catch (error) {
      setAlertState(showAlert('Error', 'An error occurred. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isChanging ? 'Change Passphrase' : 'Set Up Passphrase'}
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <Text style={styles.description}>
            {isChanging
              ? 'Enter your current passphrase and then set a new one.'
              : 'Create a passphrase to lock the app. You will need to enter it each time you open the app.'}
          </Text>

          <Card style={styles.inputCard}>
            {isChanging && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Passphrase</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassphrase}
                  onChangeText={setCurrentPassphrase}
                  placeholder="Enter current passphrase"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {isChanging ? 'New Passphrase' : 'Passphrase'}
              </Text>
              <TextInput
                style={styles.input}
                value={newPassphrase}
                onChangeText={setNewPassphrase}
                placeholder="Enter passphrase (min 6 characters)"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Passphrase</Text>
              <TextInput
                style={styles.input}
                value={confirmPassphrase}
                onChangeText={setConfirmPassphrase}
                placeholder="Re-enter passphrase"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </Card>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips for a good passphrase:</Text>
            <Text style={styles.tipItem}>• Use a mix of words and numbers</Text>
            <Text style={styles.tipItem}>• Make it memorable but not obvious</Text>
            <Text style={styles.tipItem}>• Avoid personal information</Text>
          </View>

          <Button
            title={isSubmitting ? 'Saving...' : (isChanging ? 'Change Passphrase' : 'Enable Lock')}
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={() => setAlertState(hideAlert())}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cancelButton: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  icon: {
    ...TYPOGRAPHY.display,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  inputCard: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontSize: 14,
  },
  tips: {
    marginBottom: 24,
  },
  tipsTitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  tipItem: {
    ...TYPOGRAPHY.label,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  submitButton: {
    marginBottom: 32,
  },
});
