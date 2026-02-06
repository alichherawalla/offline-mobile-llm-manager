# LocalLLM - TODO

## Document Upload Support

### High Priority

- [ ] **Install and configure react-native-document-picker**
  - Install package: `npm install react-native-document-picker`
  - Configure for iOS (pod install) and Android
  - Set up file type filters for supported text formats
  - Handle permissions on both platforms

- [ ] **Add document picker button to ChatInput**
  - Add paperclip/attachment button to ChatInput toolbar (next to camera button)
  - Open document picker on press
  - Use `documentService.processDocumentFromPath()` to read selected file
  - Add as `MediaAttachment` with `type: 'document'`
  - Show in attachment preview area (already has `documentPreview` styles)

- [ ] **Include document content in LLM context**
  - Update message building logic in ChatScreen/generationService
  - Use `documentService.formatForContext()` to format document content
  - Prepend document content to user message or use as system context
  - Handle multiple document attachments

- [ ] **Display document attachments in ChatMessage**
  - Render document attachments with file icon and filename
  - Show preview/excerpt of content
  - Make tappable to expand/view full content
  - Style consistently with image attachments

### Future / Lower Priority

- [ ] **Add PDF support with native text extraction**
  - Research and install native PDF library (e.g., `react-native-pdf-text-extractor`)
  - Update `documentService` to handle `.pdf` files
  - Add PDF to supported file types in document picker
  - Handle edge cases:
    - Encrypted PDFs (show error)
    - Scanned PDFs (warn about OCR limitation)
    - Large PDFs (truncate with warning)
  - Consider page-by-page extraction for very large documents

- [ ] **Add Word/Office document support**
  - Research libraries for .docx, .xlsx parsing
  - May require server-side processing or heavy native dependencies
  - Lower priority than PDF

---

## Image Generation (Release Build Issue)

- [x] **Debug image model loading timeout in release builds** (FIXED)
  - **Root cause:** SELinux blocks access to `/dev/adsprpc-smd` (Qualcomm DSP device) for regular apps
  - QNN/NPU backend requires direct DSP access which SELinux denies
  - **Fix:** Added automatic fallback from QNN to MNN/CPU when QNN fails
  - Shorter timeout for QNN (30s) since SELinux failures happen quickly
  - If QNN fails and CPU model exists, automatically retries with MNN backend

---

## Testing Improvements

- [ ] Fix misleading test: `ChatInput.test.tsx:383-391` - "shows alert when toggling without image model" doesn't actually test any alert
- [ ] Fix test: `intentClassifier.test.ts:739-745` - "cache key should be truncated" doesn't verify cache behavior
- [ ] Add negative tests to intent classifier (patterns that should NOT match)
- [ ] Add integration tests for failure recovery scenarios

---

## Notes

- `documentService.ts` already exists with text file reading support
- Supported text extensions: `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.html`, `.log`, `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.java`, `.c`, `.cpp`, `.h`, `.swift`, `.kt`, `.go`, `.rs`, `.rb`, `.php`, `.sql`, `.sh`, `.yaml`, `.yml`, `.toml`, `.ini`, `.cfg`, `.conf`
- Max file size: 5MB, truncated to 50k chars for LLM context
