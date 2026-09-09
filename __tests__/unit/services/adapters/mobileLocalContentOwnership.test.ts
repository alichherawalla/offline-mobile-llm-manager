import type { MessageRecord } from '@offgrid/application';
import { retainedMobileMessageByteIdentities } from '../../../../src/services/adapters/workspaceContent/mobileLocalContentOwnership';

function message(
  local: NonNullable<MessageRecord['local']>,
): MessageRecord {
  return {
    id: 'message-1',
    conversationId: 'conversation-1',
    turnId: null,
    position: 0,
    portable: {
      role: 'user',
      content: [
        { type: 'text', text: 'Image' },
        { type: 'image', contentId: 'image-1' },
      ],
    },
    local,
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
  };
}

describe('Mobile local content ownership', () => {
  it.each([
    ['canonical content identity', { contentId: 'image-1' }],
    ['legacy portable-content index', { index: 1 }],
  ] as const)('resolves %s through the shared identity policy', (_, identity) => {
    const locations = [{ ...identity, uri: 'file:///images/image-1.png' }];

    expect(
      retainedMobileMessageByteIdentities([
        message({ contentLocations: locations }),
      ]),
    ).toEqual(
      new Set([
        'gallery:image-1',
        'file:/images/image-1.png',
      ]),
    );
  });

  it('rejects a legacy index that does not resolve to portable media', () => {
    expect(() =>
      retainedMobileMessageByteIdentities([
        message({
          contentLocations: [
            { index: 0, uri: 'file:///images/image-1.png' },
          ],
        }),
      ]),
    ).toThrow('Attachment bytes do not have a stable contentId.');
  });
});
