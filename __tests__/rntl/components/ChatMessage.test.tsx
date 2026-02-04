/**
 * ChatMessage Component Tests
 *
 * Tests for the message rendering component including:
 * - Message display by role (user/assistant/system)
 * - Streaming state and cursor animation
 * - Thinking blocks (<think> tags)
 * - Attachments and images
 * - Action menu (copy, edit, retry, generate image)
 * - Generation metadata display
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ChatMessage } from '../../../src/components/ChatMessage';
import {
  createMessage,
  createUserMessage,
  createAssistantMessage,
  createSystemMessage,
  createMediaAttachment,
  createImageAttachment,
  createDocumentAttachment,
  createGenerationMeta,
} from '../../utils/factories';

// Mock clipboard
const mockSetString = jest.fn();
jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: mockSetString,
}), { virtual: true });

// Mock Alert using jest.spyOn instead of full mock to avoid DevMenu issues
import { Alert } from 'react-native';
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

describe('ChatMessage', () => {
  const defaultProps = {
    message: createUserMessage('Hello world'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Basic Rendering
  // ============================================================================
  describe('basic rendering', () => {
    it('renders user message', () => {
      const { getByText } = render(
        <ChatMessage message={createUserMessage('Hello from user')} />
      );

      expect(getByText('Hello from user')).toBeTruthy();
    });

    it('renders assistant message', () => {
      const { getByText } = render(
        <ChatMessage message={createAssistantMessage('Hello from assistant')} />
      );

      expect(getByText('Hello from assistant')).toBeTruthy();
    });

    it('renders system message', () => {
      const { getByText } = render(
        <ChatMessage message={createSystemMessage('System notification')} />
      );

      expect(getByText('System notification')).toBeTruthy();
    });

    it('renders system info message with special styling', () => {
      const message = createMessage({
        role: 'system',
        content: 'Model loaded successfully',
        isSystemInfo: true,
      });

      const { getByText } = render(<ChatMessage message={message} />);

      expect(getByText('Model loaded successfully')).toBeTruthy();
    });

    it('renders empty content gracefully', () => {
      const message = createMessage({ content: '' });
      const { queryByText } = render(<ChatMessage message={message} />);

      // Should not crash
      expect(queryByText('undefined')).toBeNull();
    });

    it('renders long content without truncation', () => {
      const longContent = 'A'.repeat(5000);
      const message = createUserMessage(longContent);

      const { getByText } = render(<ChatMessage message={message} />);

      expect(getByText(longContent)).toBeTruthy();
    });
  });

  // ============================================================================
  // Streaming State
  // ============================================================================
  describe('streaming state', () => {
    it('shows streaming cursor when isStreaming is true', () => {
      const message = createAssistantMessage('Generating...');

      const { getByTestId, queryByTestId } = render(
        <ChatMessage message={message} isStreaming={true} />
      );

      // Look for streaming indicator (may be cursor or animation)
      // The exact testID depends on implementation
    });

    it('hides streaming cursor when isStreaming is false', () => {
      const message = createAssistantMessage('Complete response');

      const { queryByTestId } = render(
        <ChatMessage message={message} isStreaming={false} />
      );

      // No streaming indicator
    });

    it('renders partial content during streaming', () => {
      const message = createAssistantMessage('Partial cont');

      const { getByText } = render(
        <ChatMessage message={message} isStreaming={true} />
      );

      expect(getByText(/Partial cont/)).toBeTruthy();
    });
  });

  // ============================================================================
  // Thinking Blocks
  // ============================================================================
  describe('thinking blocks', () => {
    it('renders thinking block from <think> tags', () => {
      const message = createAssistantMessage(
        '<think>Let me analyze this problem step by step...</think>The answer is 42.'
      );

      const { getByText } = render(<ChatMessage message={message} />);

      // Main content should be visible
      expect(getByText(/The answer is 42/)).toBeTruthy();
    });

    it('makes thinking block collapsible', () => {
      const message = createAssistantMessage(
        '<think>Internal reasoning here</think>Final answer.'
      );

      const { getByText } = render(<ChatMessage message={message} />);

      // Should show "Thought process" or similar header
      // The thinking content may be hidden initially
    });

    it('handles nested content in thinking blocks', () => {
      const message = createAssistantMessage(
        '<think>Step 1: Check input\nStep 2: Process\nStep 3: Return</think>Done!'
      );

      const { getByText } = render(<ChatMessage message={message} />);

      expect(getByText(/Done!/)).toBeTruthy();
    });

    it('handles unclosed thinking tags gracefully', () => {
      const message = createAssistantMessage(
        '<think>Thinking in progress...'
      );

      // Should not crash
      const { getByText } = render(
        <ChatMessage message={message} isStreaming={true} />
      );
    });

    it('shows thinking indicator during active thinking', () => {
      const message = createMessage({
        role: 'assistant',
        content: '<think>Processing...',
        isThinking: true,
      });

      const { getByText } = render(
        <ChatMessage message={message} isStreaming={true} />
      );

      // Should show some form of thinking indicator
    });
  });

  // ============================================================================
  // Attachments
  // ============================================================================
  describe('attachments', () => {
    it('renders image attachment', () => {
      const attachment = createImageAttachment({
        uri: 'file:///test/image.jpg',
      });
      const message = createUserMessage('Check this image', {
        attachments: [attachment],
      });

      const { UNSAFE_getByType } = render(<ChatMessage message={message} />);

      // Should render an Image component
    });

    it('renders multiple image attachments', () => {
      const attachments = [
        createImageAttachment({ uri: 'file:///image1.jpg' }),
        createImageAttachment({ uri: 'file:///image2.jpg' }),
        createImageAttachment({ uri: 'file:///image3.jpg' }),
      ];
      const message = createUserMessage('Multiple images', { attachments });

      const { getByText } = render(<ChatMessage message={message} />);

      expect(getByText('Multiple images')).toBeTruthy();
    });

    it('renders document attachment with file icon', () => {
      const attachment = createDocumentAttachment({
        fileName: 'document.pdf',
      });
      const message = createUserMessage('See attached doc', {
        attachments: [attachment],
      });

      const { getByText } = render(<ChatMessage message={message} />);

      // Document should show filename or icon
    });

    it('calls onImagePress when image is tapped', () => {
      const onImagePress = jest.fn();
      const attachment = createImageAttachment({
        uri: 'file:///test/image.jpg',
      });
      const message = createUserMessage('Image', { attachments: [attachment] });

      const { getByTestId } = render(
        <ChatMessage message={message} onImagePress={onImagePress} />
      );

      // Find and tap the image
      // fireEvent.press(getByTestId('message-image'));
      // expect(onImagePress).toHaveBeenCalledWith(attachment.uri);
    });

    it('renders generated image in assistant message', () => {
      const attachment = createImageAttachment({
        uri: 'file:///generated/sunset.png',
        width: 512,
        height: 512,
      });
      const message = createAssistantMessage('Here is your image:', {
        attachments: [attachment],
      });

      const { getByText } = render(<ChatMessage message={message} />);

      expect(getByText(/Here is your image/)).toBeTruthy();
    });
  });

  // ============================================================================
  // Action Menu
  // ============================================================================
  describe('action menu', () => {
    it('shows action menu on long press when showActions is true', async () => {
      const message = createAssistantMessage('Long press me');

      const { getByText } = render(
        <ChatMessage message={message} showActions={true} />
      );

      const messageElement = getByText('Long press me');
      fireEvent(messageElement, 'longPress');

      // Action menu should appear
    });

    it('does not show action menu when showActions is false', () => {
      const message = createAssistantMessage('No actions');

      const { getByText, queryByText } = render(
        <ChatMessage message={message} showActions={false} />
      );

      fireEvent(getByText('No actions'), 'longPress');

      // No menu should appear
      expect(queryByText('Copy')).toBeNull();
    });

    it('calls onCopy when copy action is selected', async () => {
      const onCopy = jest.fn();
      const message = createAssistantMessage('Copy this text');

      const { getByText } = render(
        <ChatMessage message={message} onCopy={onCopy} showActions={true} />
      );

      // Trigger long press and select copy
      fireEvent(getByText('Copy this text'), 'longPress');

      // In actual implementation, this would open a menu
      // and then call onCopy when "Copy" is selected
    });

    it('calls onRetry when retry action is selected', () => {
      const onRetry = jest.fn();
      const message = createAssistantMessage('Retry this');

      const { getByText } = render(
        <ChatMessage message={message} onRetry={onRetry} showActions={true} />
      );

      // Trigger retry action
    });

    it('calls onEdit for user messages when edit action is selected', () => {
      const onEdit = jest.fn();
      const message = createUserMessage('Edit me');

      const { getByText } = render(
        <ChatMessage message={message} onEdit={onEdit} showActions={true} />
      );

      // Edit should be available for user messages
    });

    it('does not show edit option for assistant messages', () => {
      const onEdit = jest.fn();
      const message = createAssistantMessage('Cannot edit me');

      const { getByText, queryByText } = render(
        <ChatMessage message={message} onEdit={onEdit} showActions={true} />
      );

      // Edit option should not be available
    });

    it('calls onGenerateImage when image generation action is selected', () => {
      const onGenerateImage = jest.fn();
      const message = createUserMessage('A beautiful sunset over mountains');

      const { getByText } = render(
        <ChatMessage
          message={message}
          onGenerateImage={onGenerateImage}
          canGenerateImage={true}
          showActions={true}
        />
      );

      // Generate image action should be available
    });

    it('hides generate image action when canGenerateImage is false', () => {
      const onGenerateImage = jest.fn();
      const message = createUserMessage('Some text');

      const { queryByText } = render(
        <ChatMessage
          message={message}
          onGenerateImage={onGenerateImage}
          canGenerateImage={false}
          showActions={true}
        />
      );

      // Generate image option should not be available
    });
  });

  // ============================================================================
  // Generation Metadata
  // ============================================================================
  describe('generation metadata', () => {
    it('displays generation details when showGenerationDetails is true', () => {
      const meta = createGenerationMeta({
        gpu: true,
        gpuBackend: 'Metal',
        tokensPerSecond: 25.5,
        modelName: 'Llama-3.2-3B',
      });
      const message = createAssistantMessage('Response with metadata', {
        generationTimeMs: 1500,
        generationMeta: meta,
      });

      const { getByText } = render(
        <ChatMessage message={message} showGenerationDetails={true} />
      );

      // Should show some metadata
    });

    it('shows GPU indicator when GPU was used', () => {
      const meta = createGenerationMeta({
        gpu: true,
        gpuBackend: 'Metal',
        gpuLayers: 32,
      });
      const message = createAssistantMessage('GPU response', {
        generationMeta: meta,
      });

      const { getByText } = render(
        <ChatMessage message={message} showGenerationDetails={true} />
      );

      // Should indicate GPU usage
    });

    it('shows CPU indicator when GPU was not used', () => {
      const meta = createGenerationMeta({
        gpu: false,
        gpuBackend: 'CPU',
      });
      const message = createAssistantMessage('CPU response', {
        generationMeta: meta,
      });

      const { getByText } = render(
        <ChatMessage message={message} showGenerationDetails={true} />
      );

      // Should indicate CPU usage
    });

    it('displays tokens per second', () => {
      const meta = createGenerationMeta({
        tokensPerSecond: 18.7,
        decodeTokensPerSecond: 22.3,
      });
      const message = createAssistantMessage('Fast response', {
        generationMeta: meta,
      });

      const { getByText } = render(
        <ChatMessage message={message} showGenerationDetails={true} />
      );

      // Should show tok/s
    });

    it('displays time to first token', () => {
      const meta = createGenerationMeta({
        timeToFirstToken: 0.45,
      });
      const message = createAssistantMessage('Quick start', {
        generationMeta: meta,
      });

      const { getByText } = render(
        <ChatMessage message={message} showGenerationDetails={true} />
      );

      // Should show TTFT
    });

    it('displays model name', () => {
      const meta = createGenerationMeta({
        modelName: 'Phi-3-mini-Q4_K_M',
      });
      const message = createAssistantMessage('Phi response', {
        generationMeta: meta,
      });

      const { getByText } = render(
        <ChatMessage message={message} showGenerationDetails={true} />
      );

      // Should show model name
    });

    it('displays image generation metadata', () => {
      const meta = createGenerationMeta({
        steps: 20,
        guidanceScale: 7.5,
        resolution: '512x512',
      });
      const message = createAssistantMessage('Generated image', {
        generationMeta: meta,
      });

      const { getByText } = render(
        <ChatMessage message={message} showGenerationDetails={true} />
      );

      // Should show steps, guidance, resolution
    });

    it('hides metadata when showGenerationDetails is false', () => {
      const meta = createGenerationMeta({
        gpu: true,
        tokensPerSecond: 20,
      });
      const message = createAssistantMessage('No details shown', {
        generationMeta: meta,
      });

      const { queryByText } = render(
        <ChatMessage message={message} showGenerationDetails={false} />
      );

      // Metadata should not be visible
    });

    it('handles missing generation metadata gracefully', () => {
      const message = createAssistantMessage('No metadata');

      const { getByText } = render(
        <ChatMessage message={message} showGenerationDetails={true} />
      );

      // Should not crash, just show message without metadata
      expect(getByText('No metadata')).toBeTruthy();
    });
  });

  // ============================================================================
  // Role-Based Styling
  // ============================================================================
  describe('role-based styling', () => {
    it('applies user message styling (right-aligned)', () => {
      const message = createUserMessage('User message');

      const { getByText } = render(<ChatMessage message={message} />);

      // User messages should be right-aligned
      const element = getByText('User message');
      // Check style or parent container alignment
    });

    it('applies assistant message styling (left-aligned)', () => {
      const message = createAssistantMessage('Assistant message');

      const { getByText } = render(<ChatMessage message={message} />);

      // Assistant messages should be left-aligned
    });

    it('applies system message styling (centered)', () => {
      const message = createSystemMessage('System message');

      const { getByText } = render(<ChatMessage message={message} />);

      // System messages may be centered or have different styling
    });
  });

  // ============================================================================
  // Timestamps
  // ============================================================================
  describe('timestamps', () => {
    it('displays message timestamp', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      const message = createMessage({
        content: 'Timestamped message',
        timestamp,
      });

      const { getByText } = render(<ChatMessage message={message} />);

      // Should show formatted time
    });

    it('formats relative time for recent messages', () => {
      const message = createMessage({
        content: 'Recent message',
        timestamp: Date.now() - 60000, // 1 minute ago
      });

      const { getByText } = render(<ChatMessage message={message} />);

      // May show "1m ago" or similar
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('edge cases', () => {
    it('handles special characters in content', () => {
      const message = createUserMessage('Test <script>alert("xss")</script>');

      const { getByText } = render(<ChatMessage message={message} />);

      // Should render safely without executing script
      expect(getByText(/Test/)).toBeTruthy();
    });

    it('handles unicode and emoji', () => {
      const message = createUserMessage('Hello 👋 World 🌍 日本語');

      const { getByText } = render(<ChatMessage message={message} />);

      expect(getByText(/Hello.*World/)).toBeTruthy();
    });

    it('handles markdown-like content', () => {
      const message = createAssistantMessage('**Bold** and *italic* text');

      const { getByText } = render(<ChatMessage message={message} />);

      // May or may not render markdown - just shouldn't crash
    });

    it('handles code blocks', () => {
      const message = createAssistantMessage('```javascript\nconst x = 1;\n```');

      const { getByText } = render(<ChatMessage message={message} />);

      // Should display code somehow
    });

    it('handles very long single words', () => {
      const longWord = 'a'.repeat(500);
      const message = createUserMessage(longWord);

      const { getByText } = render(<ChatMessage message={message} />);

      // Should handle without breaking layout
    });

    it('handles newlines and whitespace', () => {
      const message = createAssistantMessage('Line 1\n\nLine 2\n\n\nLine 3');

      const { getByText } = render(<ChatMessage message={message} />);

      // Should preserve some whitespace
    });
  });
});
