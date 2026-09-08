import type {
  LocalMessageContentLocation,
  MessageRecord,
  PortableMessageContentPart,
} from '@offgrid/application';
import {appendDocumentText} from '@offgrid/models';

type MobileAttachmentInput = Readonly<Record<string, unknown>>;

/** Project legacy Mobile attachments onto canonical rich parts plus indexed local locations. */
export function projectMobileMessageContent(input: {
  content: unknown;
  attachments?: unknown;
}): {
  content: MessageRecord['portable']['content'];
  locations?: readonly LocalMessageContentLocation[];
} {
  const content = typeof input.content === 'string' ? input.content : '';
  if (input.attachments === undefined) return {content};
  if (!Array.isArray(input.attachments)) throw new Error('message.attachments is not an array');
  if (input.attachments.length === 0) return {content};
  const parts: PortableMessageContentPart[] = [{type: 'text', text: content}];
  const locations: LocalMessageContentLocation[] = [];
  for (const [offset, value] of input.attachments.entries()) {
    const label = `message.attachments[${offset}]`;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${label} is not an object`);
    }
    const attachment = value as MobileAttachmentInput;
    const type = requiredString(attachment.type, `${label}.type`);
    const unsupported = (type === 'audio'
      ? ['pending']
      : type === 'document'
        ? ['pending', 'audioFormat', 'audioDurationSeconds']
        : ['pending', 'textContent', 'audioFormat', 'audioDurationSeconds'])
      .find(key => attachment[key] !== undefined);
    if (unsupported) throw new Error(`${label}.${unsupported} has no canonical rich-content field`);
    const mimeType = optionalString(attachment.mimeType, `${label}.mimeType`);
    const name = optionalString(attachment.fileName, `${label}.fileName`);
    const sizeBytes = optionalNonNegativeNumber(
      attachment.fileSize,
      `${label}.fileSize`,
    );
    const contentId = requiredString(attachment.id, `${label}.id`);
    if (type === 'image') {
      parts.push({
        type: 'image', contentId, id: contentId,
        ...(name === undefined ? {} : {name}),
        ...(mimeType === undefined ? {} : {mimeType}),
        ...(sizeBytes === undefined ? {} : {sizeBytes}),
        ...optionalDimensions(attachment, label),
      });
    } else if (type === 'audio') {
      const transcription = optionalString(
        attachment.textContent,
        `${label}.textContent`,
      );
      const textPart = parts[0];
      if (
        transcription &&
        textPart?.type === 'text' &&
        textPart.text.length === 0
      ) {
        parts[0] = {type: 'text', text: transcription};
      } else if (
        transcription &&
        textPart?.type === 'text' &&
        transcription !== textPart.text
      ) {
        throw new Error(`${label}.textContent conflicts with message.content`);
      }
      const durationSeconds = optionalNonNegativeNumber(
        attachment.audioDurationSeconds,
        `${label}.audioDurationSeconds`,
      );
      const canonicalMimeType = canonicalAudioMimeType(
        attachment.audioFormat,
        mimeType,
        label,
      );
      parts.push({
        type: 'audio', contentId,
        ...(name === undefined ? {} : {name}),
        ...(canonicalMimeType === undefined
          ? {}
          : {mimeType: canonicalMimeType}),
        ...(sizeBytes === undefined ? {} : {sizeBytes}),
        ...(durationSeconds === undefined ? {} : {durationSeconds}),
      });
    } else if (type === 'document') {
      const extractedText = optionalString(
        attachment.textContent,
        `${label}.textContent`,
      );
      const textPart = parts[0];
      if (textPart?.type === 'text') {
        parts[0] = {
          type: 'text',
          text: appendDocumentText(textPart.text, {
            ...(name === undefined ? {} : {fileName: name}),
            ...(extractedText === undefined ? {} : {textContent: extractedText}),
          }),
        };
      }
      parts.push({type: 'file', contentId, ...(name === undefined ? {} : {name}),
        ...(mimeType === undefined ? {} : {mimeType}),
        ...(sizeBytes === undefined ? {} : {sizeBytes})});
    } else throw new Error(`${label}.type is not supported`);
    locations.push({index: offset + 1, uri: requiredString(attachment.uri, `${label}.uri`)});
  }
  return {content: parts, locations};
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is not text`);
  return value;
}

function optionalString(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${label} is not text`);
  return value;
}

function optionalNonNegativeNumber(
  value: unknown,
  label: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} is not a non-negative finite number`);
  }
  return value;
}

function canonicalAudioMimeType(
  format: unknown,
  mimeType: string | undefined,
  label: string,
): string | undefined {
  if (format === undefined) return mimeType;
  if (format !== 'wav' && format !== 'mp3') {
    throw new Error(`${label}.audioFormat is not supported`);
  }
  const expected =
    format === 'wav'
      ? ['audio/wav', 'audio/x-wav']
      : ['audio/mpeg', 'audio/mp3'];
  if (mimeType !== undefined && !expected.includes(mimeType.toLowerCase())) {
    throw new Error(`${label}.audioFormat conflicts with ${label}.mimeType`);
  }
  return mimeType ?? expected[0];
}

function optionalDimensions(attachment: MobileAttachmentInput, label: string) {
  for (const key of ['width', 'height'] as const) {
    const value = attachment[key];
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error(`${label}.${key} is not a finite number`);
    }
  }
  return {
    ...(attachment.width === undefined ? {} : {width: attachment.width as number}),
    ...(attachment.height === undefined ? {} : {height: attachment.height as number}),
  };
}
