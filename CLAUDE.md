# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Recipe Migrator AI is a React-based web application that digitizes recipes from various file formats (images, PDF, TXT, DOCX) using Google's Gemini AI and exports them to Tandoor Recipe Manager. The app features a batch processing queue system with in-app review/editing capabilities.

**Tech Stack:**
- React 19 + TypeScript
- Vite 5.2 as build tool
- Google Generative AI SDK v1.34.0
- Mammoth.js for DOCX parsing
- Nginx for reverse proxy (Docker only)
- Multi-stage Docker build (Node builder + Nginx runtime)

## Common Commands

### Development
- `npm install` - Install dependencies
- `npm run dev` - Start Vite development server
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build locally

### Docker
- Build: `docker build -t recipe-migrator .`
- Run: `docker run -p 80:80 -e API_KEY=your_gemini_api_key -e TANDOOR_API_KEY=your_tandoor_token -e TANDOOR_ORIGIN=https://your-tandoor.com recipe-migrator`

## Architecture

### Core Data Flow
1. **File Upload** (App.tsx): Files added via drag-drop or file input → converted to FileItem objects with preview URLs
2. **Batch Processing** (App.tsx:95-139): Sequential processing through Gemini API for each pending file
3. **AI Extraction** (services/geminiService.ts): Gemini API extracts structured recipe data using defined schema
4. **Review** (components/RecipeReview.tsx): User reviews/edits extracted recipe in split-screen view with source preview
5. **Export** (App.tsx:153-211): Upload to Tandoor API or download as JSON

### Key Components

**App.tsx** - Main application orchestration
- Manages file queue state and processing lifecycle
- Handles file type detection (images use base64, text files read as plain text, DOCX extracted via mammoth)
- Implements Tandoor API integration with bearer token authentication
- Split-screen layout: sidebar queue + main review area

**services/geminiService.ts** - AI extraction service
- Uses structured output with predefined JSON schema (RECIPE_SCHEMA)
- Model: `gemini-3-pro-preview`
- Handles both inline data (images/PDF as base64) and text parts (TXT/DOCX)
- Critical: Preserves original language in extraction (no translation)

**components/RecipeReview.tsx** - Recipe editor
- Editable fields: name, description, servings, times, ingredients (amount/unit/name), steps, keywords
- Dynamic add/remove for ingredients, steps, and keywords

**types.ts** - Core data structures
- Recipe: Complete recipe with ingredients, steps, metadata
- FileItem: Queue item with file, preview, status (PENDING/PROCESSING/REVIEW/COMPLETED/ERROR)
- ProcessStatus enum for tracking file lifecycle

### Runtime Environment Configuration

The app uses runtime environment injection via Docker to handle API keys securely:

1. **Vite Config** (vite.config.ts): Redirects `process.env.API_KEY` and `process.env.TANDOOR_API_KEY` to window variables
2. **Docker Entrypoint** (docker-entrypoint.sh): Injects environment variables into index.html at container startup
3. **Usage**: Services read from `process.env.*`, which resolves to runtime-injected values

Required environment variables:
- `API_KEY`: Google Gemini API key for recipe extraction
- `TANDOOR_API_KEY`: Tandoor authentication token
- `TANDOOR_ORIGIN`: Tandoor instance URL (e.g., https://tandoor.example.com)

This pattern allows building the app once and deploying with different configurations by setting environment variables at runtime.

### Tandoor Integration

**CORS-Free Architecture**: Uses nginx reverse proxy pattern to avoid CORS issues
- Browser calls: `/tandoor-api/api/recipe/`
- Nginx proxies to: `$TANDOOR_ORIGIN/api/recipe/`
- No CORS preflight needed, secure API key handling

The Tandoor API endpoint (`POST /api/recipe/`) requires:
- Bearer token authentication (provided via `TANDOOR_API_KEY` env var)
- Keywords as `{ name }`
- Steps as `{ instruction, ingredients: [...] }` - **ingredients array is required per step**
- Ingredients inside steps mapped to `{ amount, unit: {name}, food: {name}, note }`

**Important Architecture Note**: Tandoor does NOT have a recipe-level ingredients array. Ingredients must be nested within steps. The app places all recipe ingredients into the first step's ingredients array.

**Important**: Tandoor may require pre-existing Food/Unit IDs or strict mode disabled for auto-creation.

**Configuration**: All Tandoor settings are configured via environment variables at deployment time. No UI configuration needed.

## File Structure

```
├── App.tsx                    # Main app, queue management, Tandoor integration
├── components/
│   └── RecipeReview.tsx       # Recipe editor component
├── services/
│   └── geminiService.ts       # Gemini AI extraction logic
├── types.ts                   # TypeScript interfaces and enums
├── index.tsx                  # React entry point
├── vite.config.ts             # Vite config with runtime env setup
├── Dockerfile                 # Multi-stage build (Node builder + Nginx server)
├── docker-entrypoint.sh       # Runtime env injection script
├── nginx.conf                 # Nginx SPA routing config
└── package.json               # Dependencies and scripts
```

## Technical Notes

- **State Management**: All state managed in App.tsx via useState hooks (no global state library)
- **File Processing**: Sequential processing to maintain order and avoid API rate limits
- **Preview Generation**: Uses `URL.createObjectURL()` for image/PDF previews
- **Error Handling**: Files with errors remain in queue with ERROR status and error message
- **Environment Variables**: All API keys configured via environment variables (no in-app configuration UI)
- **CORS Handling**: Nginx reverse proxy pattern eliminates CORS issues without backend complexity
- **Security**: API keys injected at runtime, never bundled in client code or exposed to browser storage

## Common Issues and Solutions

### API Key Configuration
- **Local Dev**: Use `VITE_API_KEY`, `VITE_TANDOOR_API_KEY`, `VITE_TANDOOR_ORIGIN` in `.env.local`
- **Docker**: Use `API_KEY`, `TANDOOR_API_KEY`, `TANDOOR_ORIGIN` as environment variables
- **Important**: Vite config redirects `process.env.*` to `window.*` for runtime injection

### Tandoor Integration
- **Authentication**: Must use Bearer token format: `Token <token_value>`
- **Ingredients Structure**: All ingredients must be nested within the first step's ingredients array (Tandoor has no recipe-level ingredients)
- **Step Format**: Each step requires `instruction` and `ingredients` array (even if empty)
- **Keywords**: Format as `{ name: string }` objects
- **Food/Units**: May require pre-existing entries or strict mode disabled in Tandoor

### File Processing
- **Supported MIME Types**:
  - Images: image/png, image/jpeg, image/jpg, image/webp
  - Documents: application/pdf, text/plain, application/vnd.openxmlformats-officedocument.wordprocessingml.document
- **File Reading Strategy**:
  - Images/PDFs: Convert to base64 via FileReader
  - Text files: Read as plain text
  - DOCX: Extract via mammoth.js, convert to plain text
- **Memory Limits**: Browser-dependent, typically 10-20MB per file

### Gemini API
- **Model**: gemini-3-pro-preview (supports structured output)
- **Schema**: RECIPE_SCHEMA defines strict JSON structure for extraction
- **Language Handling**: Model configured to preserve original language (no translation)
- **Rate Limiting**: Sequential processing prevents rate limit errors

## Development Workflow

### Adding New File Types
1. Update file input accept attribute in App.tsx
2. Add MIME type handling in file reading logic (App.tsx:59-84)
3. Update RECIPE_SCHEMA in geminiService.ts if needed
4. Test extraction with sample files

### Modifying Recipe Schema
1. Update RECIPE_SCHEMA in services/geminiService.ts
2. Update Recipe interface in types.ts
3. Update RecipeReview.tsx editor UI
4. Update Tandoor payload mapping in App.tsx:153-211

### Environment Variable Changes
1. Update vite.config.ts define section
2. Update docker-entrypoint.sh injection script
3. Update CLAUDE.md and README.md documentation

## Debugging Tips

### Extraction Failures
- Check browser console for Gemini API errors
- Verify API key is valid and has quota remaining
- Inspect file content (preview) to ensure it's readable
- Try with a simpler/clearer recipe source

### Tandoor Upload Issues
- Check browser Network tab for API response details
- Verify TANDOOR_ORIGIN doesn't have trailing slash
- Ensure API token includes "Token" prefix
- Check Tandoor logs for server-side errors
- Verify Tandoor API is accessible from the app's network

### Docker Issues
- If env vars not working: Check docker-entrypoint.sh execution permissions
- If nginx proxy fails: Verify TANDOOR_ORIGIN is set and reachable
- If build fails: Clear Docker cache with `docker build --no-cache`

## Performance Considerations

- **File Queue**: Unlimited queue size, but processing is sequential
- **Memory Usage**: Each file's preview URL creates a blob object reference
- **API Latency**: Gemini API typically 2-5 seconds per recipe
- **Bundle Size**: ~500KB gzipped (React 19 + minimal dependencies)

## Security Notes

- **API Keys**: Never commit keys to git (use .env.local locally)
- **Docker Runtime Injection**: Keys injected at container start, not build time
- **CORS**: Nginx proxy prevents exposing Tandoor credentials to browser
- **Input Validation**: File type validation on client side (MIME type check)
- **No Backend**: All processing happens client-side or via external APIs

## Testing Strategy

### Manual Testing Checklist
- [ ] Upload each supported file type (PNG, JPG, WEBP, PDF, TXT, DOCX)
- [ ] Process batch with multiple files
- [ ] Edit extracted recipe fields (ingredients, steps, keywords)
- [ ] Upload to Tandoor successfully
- [ ] Download JSON and verify structure
- [ ] Test error handling (invalid API key, network failures)
- [ ] Verify environment variable injection in Docker
- [ ] Test nginx proxy functionality

### Common Test Cases
1. **Single Image Upload**: Upload clear recipe image, verify extraction
2. **Multi-language Support**: Test recipes in different languages (German, French, Spanish)
3. **Complex Recipes**: Test recipes with many ingredients/steps
4. **Edge Cases**: Empty files, corrupted files, non-recipe content
5. **Tandoor Integration**: Full workflow from upload to Tandoor import

## Code Quality Guidelines

### When Making Changes
- **Preserve Existing Patterns**: Follow the established state management pattern (useState in App.tsx)
- **Type Safety**: Use TypeScript strictly, avoid `any` types
- **Error Handling**: Always catch and display errors to user
- **User Feedback**: Update file status (PROCESSING, REVIEW, ERROR) appropriately
- **Code Style**: Follow existing formatting (2-space indent, semicolons)

### Common Pitfalls to Avoid
- Don't add global state libraries (keep it simple with useState)
- Don't bundle API keys in client code
- Don't break the nginx proxy pattern (all Tandoor requests through `/tandoor-api/`)
- Don't translate recipes during extraction (preserve original language)
- Don't modify step structure without updating Tandoor payload mapping
- Don't add backend dependencies (app is intentionally frontend-only)

## Future Enhancement Ideas

**Note**: These are potential improvements, not current features:
- Add recipe search within uploaded recipes
- Support for video recipe extraction (YouTube, TikTok)
- Batch download all recipes as JSON
- Recipe format validation before Tandoor upload
- Custom Gemini prompt templates
- Recipe duplicate detection
- Multi-language UI (currently English only)
- Undo/redo in recipe editor
- Recipe preview before processing
- Export to other formats (PDF, Markdown, etc.)
