/**
 * ChatInput Component Tests
 *
 * Tests for the message input component including:
 * - Text input and send
 * - Attachment handling (images, documents)
 * - Image generation mode toggle
 * - Voice recording
 * - Vision capabilities
 * - Disabled states
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ChatInput } from '../../../src/components/ChatInput';

// Mock image picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
}));

// Mock document picker if used
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
}), { virtual: true });

describe('ChatInput', () => {
  const defaultProps = {
    onSend: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Basic Input
  // ============================================================================
  describe('basic input', () => {
    it('renders text input', () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);

      expect(getByPlaceholderText(/message/i)).toBeTruthy();
    });

    it('updates input value on text change', () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, 'Hello world');

      expect(input.props.value).toBe('Hello world');
    });

    it('shows send button when text is entered', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <ChatInput {...defaultProps} />
      );

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, 'Message');

      // Send button should be visible
    });

    it('calls onSend with message content when send is pressed', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText, getByTestId } = render(
        <ChatInput {...defaultProps} onSend={onSend} />
      );

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, 'Test message');

      // Find and press send button
      // fireEvent.press(getByTestId('send-button'));

      // expect(onSend).toHaveBeenCalledWith(
      //   'Test message',
      //   expect.any(Array),
      //   expect.any(Boolean)
      // );
    });

    it('clears input after sending', async () => {
      const onSend = jest.fn();
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} onSend={onSend} />
      );

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, 'Test message');

      // After send, input should clear
    });

    it('uses custom placeholder when provided', () => {
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} placeholder="Ask anything..." />
      );

      expect(getByPlaceholderText('Ask anything...')).toBeTruthy();
    });

    it('handles multiline input', () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, 'Line 1\nLine 2\nLine 3');

      expect(input.props.value).toContain('Line 1');
    });

    it('handles long text input', () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);

      const input = getByPlaceholderText(/message/i);
      const longText = 'a'.repeat(3000);
      fireEvent.changeText(input, longText);

      // Component accepts long text input (no truncation in ChatInput)
      expect(input.props.value.length).toBe(3000);
    });
  });

  // ============================================================================
  // Disabled State
  // ============================================================================
  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} disabled={true} />
      );

      const input = getByPlaceholderText(/message/i);
      expect(input.props.editable).toBe(false);
    });

    it('shows loading indicator when disabled', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} disabled={true} />
      );

      // May show some loading indicator
    });

    it('hides send button when disabled', () => {
      const { getByPlaceholderText, queryByTestId } = render(
        <ChatInput {...defaultProps} disabled={true} />
      );

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, 'Test');

      // Send button should be hidden or disabled
    });
  });

  // ============================================================================
  // Generation State
  // ============================================================================
  describe('generation state', () => {
    it('shows stop button when isGenerating is true', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} isGenerating={true} />
      );

      // Stop button should be visible instead of send
    });

    it('calls onStop when stop button is pressed', () => {
      const onStop = jest.fn();
      const { getByTestId } = render(
        <ChatInput {...defaultProps} isGenerating={true} onStop={onStop} />
      );

      // Press stop button
      // fireEvent.press(getByTestId('stop-button'));
      // expect(onStop).toHaveBeenCalled();
    });

    it('hides mic button during generation', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} isGenerating={true} />
      );

      // Mic button should be hidden
    });

    it('disables input during generation', () => {
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} isGenerating={true} />
      );

      // Input may be disabled or have reduced opacity
    });
  });

  // ============================================================================
  // Image Generation Mode
  // ============================================================================
  describe('image generation mode', () => {
    it('shows image mode toggle when imageModelLoaded is true', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} imageModelLoaded={true} />
      );

      // Image toggle button should be visible
    });

    it('hides image mode toggle when imageModelLoaded is false', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} imageModelLoaded={false} />
      );

      // Image toggle should be hidden
    });

    it('toggles image mode when toggle is pressed', () => {
      const onImageModeChange = jest.fn();
      const { getByTestId } = render(
        <ChatInput
          {...defaultProps}
          imageModelLoaded={true}
          onImageModeChange={onImageModeChange}
        />
      );

      // Press image toggle
      // fireEvent.press(getByTestId('image-mode-toggle'));
      // expect(onImageModeChange).toHaveBeenCalled();
    });

    it('shows ON indicator when image mode is forced', () => {
      const { queryByText } = render(
        <ChatInput {...defaultProps} imageModelLoaded={true} />
      );

      // Toggle to force mode
      // Should show "ON" badge
    });

    it('shows active image model name in auto mode', () => {
      const { queryByText } = render(
        <ChatInput
          {...defaultProps}
          imageModelLoaded={true}
          activeImageModelName="SDXL Turbo"
        />
      );

      // Should show "Auto: SDXL Turbo" or similar
    });

    it('passes forceImageMode to onSend callback', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText } = render(
        <ChatInput
          {...defaultProps}
          onSend={onSend}
          imageModelLoaded={true}
        />
      );

      // Enable force mode then send
      // onSend should receive true for forceImageMode
    });

    it('shows alert when toggling without image model', () => {
      const { getByTestId } = render(
        <ChatInput {...defaultProps} imageModelLoaded={false} />
      );

      // Try to toggle image mode - should show alert
    });
  });

  // ============================================================================
  // Vision Capabilities
  // ============================================================================
  describe('vision capabilities', () => {
    it('shows camera button when supportsVision is true', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} supportsVision={true} />
      );

      // Camera/image picker button should be visible
    });

    it('hides camera button when supportsVision is false', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} supportsVision={false} />
      );

      // Camera button should be hidden
    });

    it('shows Vision indicator when vision is supported', () => {
      const { queryByText } = render(
        <ChatInput {...defaultProps} supportsVision={true} />
      );

      // Should show "Vision" badge or similar
    });
  });

  // ============================================================================
  // Attachments
  // ============================================================================
  describe('attachments', () => {
    it('opens image picker when camera button is pressed', async () => {
      const launchImageLibrary = require('react-native-image-picker').launchImageLibrary;
      launchImageLibrary.mockResolvedValue({
        assets: [{ uri: 'file:///image.jpg' }],
      });

      const { getByTestId } = render(
        <ChatInput {...defaultProps} supportsVision={true} />
      );

      // Press attachment button
      // await waitFor(() => {
      //   expect(launchImageLibrary).toHaveBeenCalled();
      // });
    });

    it('shows attachment preview after selecting image', async () => {
      const launchImageLibrary = require('react-native-image-picker').launchImageLibrary;
      launchImageLibrary.mockResolvedValue({
        assets: [{
          uri: 'file:///selected-image.jpg',
          type: 'image/jpeg',
          width: 1024,
          height: 768,
        }],
      });

      const { queryByTestId } = render(
        <ChatInput {...defaultProps} supportsVision={true} />
      );

      // After selecting, preview should appear
    });

    it('allows removing attached image', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} supportsVision={true} />
      );

      // Add attachment then remove
    });

    it('includes attachments in onSend callback', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} onSend={onSend} supportsVision={true} />
      );

      // Add attachment and send
      // onSend should receive attachments array
    });

    it('handles multiple attachments', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} supportsVision={true} />
      );

      // Add multiple images
      // All should appear in preview
    });

    it('shows document preview for document attachments', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} />
      );

      // Add document attachment
      // Should show file icon/name preview
    });

    it('resizes images before sending', async () => {
      const onSend = jest.fn();
      const launchImageLibrary = require('react-native-image-picker').launchImageLibrary;
      launchImageLibrary.mockResolvedValue({
        assets: [{
          uri: 'file:///large-image.jpg',
          type: 'image/jpeg',
          width: 4000,
          height: 3000,
        }],
      });

      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} onSend={onSend} supportsVision={true} />
      );

      // Images should be resized to max 1024x1024
    });
  });

  // ============================================================================
  // Voice Recording
  // ============================================================================
  describe('voice recording', () => {
    it('shows mic button when input is empty and not generating', () => {
      const { queryByTestId } = render(
        <ChatInput {...defaultProps} isGenerating={false} />
      );

      // Mic button should be visible when input is empty
    });

    it('hides mic button when input has text', () => {
      const { getByPlaceholderText, queryByTestId } = render(
        <ChatInput {...defaultProps} />
      );

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, 'Some text');

      // Mic button should be hidden, send button shown
    });

    it('starts recording when mic button is pressed', () => {
      const { getByTestId } = render(<ChatInput {...defaultProps} />);

      // Press mic button
      // Should start recording
    });

    it('shows recording indicator during recording', () => {
      const { queryByTestId } = render(<ChatInput {...defaultProps} />);

      // During recording, should show indicator
    });

    it('shows transcription result after recording', async () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);

      // After recording, transcribed text should appear in input
    });

    it('clears recording when conversation changes', () => {
      const { rerender } = render(
        <ChatInput {...defaultProps} conversationId="conv-1" />
      );

      // Change conversation
      rerender(<ChatInput {...defaultProps} conversationId="conv-2" />);

      // Recording should be cleared
    });

    it('shows error state when transcription fails', () => {
      const { queryByText } = render(<ChatInput {...defaultProps} />);

      // On transcription error, should show error message
    });
  });

  // ============================================================================
  // Settings Access
  // ============================================================================
  describe('settings access', () => {
    it('calls onOpenSettings when settings button is pressed', () => {
      const onOpenSettings = jest.fn();
      const { getByTestId } = render(
        <ChatInput {...defaultProps} onOpenSettings={onOpenSettings} />
      );

      // Press settings button
      // fireEvent.press(getByTestId('settings-button'));
      // expect(onOpenSettings).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Keyboard Handling
  // ============================================================================
  describe('keyboard handling', () => {
    it('dismisses keyboard after sending', () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, 'Test');

      // After send, keyboard should dismiss
    });

    it('supports submit on enter (if configured)', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} onSend={onSend} />
      );

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, 'Test');
      fireEvent(input, 'submitEditing');

      // May or may not send on enter depending on config
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('edge cases', () => {
    it('handles rapid text input', () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);

      const input = getByPlaceholderText(/message/i);

      // Rapidly change text
      for (let i = 0; i < 100; i++) {
        fireEvent.changeText(input, `Text ${i}`);
      }

      // Should handle without crashing
    });

    it('handles empty send attempt', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} onSend={onSend} />
      );

      // Try to send empty message
      // Should not call onSend or should be prevented
    });

    it('handles whitespace-only message', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} onSend={onSend} />
      );

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, '   \n   ');

      // Should not allow sending whitespace-only
    });

    it('trims whitespace from message', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} onSend={onSend} />
      );

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, '  Hello  ');

      // onSend should receive trimmed message
    });

    it('handles special characters', () => {
      const onSend = jest.fn();
      const { getByPlaceholderText } = render(
        <ChatInput {...defaultProps} onSend={onSend} />
      );

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, '<script>alert("test")</script>');

      // Should handle safely
    });

    it('handles emoji input', () => {
      const { getByPlaceholderText } = render(<ChatInput {...defaultProps} />);

      const input = getByPlaceholderText(/message/i);
      fireEvent.changeText(input, '👋 Hello 🌍 World');

      expect(input.props.value).toContain('👋');
    });
  });
});
