# Recipe Migrator AI

A React-based web application that digitizes recipes from various file formats using Google's Gemini AI and exports them to Tandoor Recipe Manager. The app features a batch processing queue system with in-app review and editing capabilities.

## Features

- **Multi-format Support**: Upload recipes from images (PNG, JPG, WEBP), PDFs, text files, and Word documents
- **AI-Powered Extraction**: Uses Google Gemini AI to intelligently extract structured recipe data
- **Batch Processing**: Process multiple recipe files in sequence with a visual queue
- **In-App Editor**: Review and edit extracted recipes before export
- **Tandoor Integration**: Direct upload to your Tandoor Recipe Manager instance
- **Language Preservation**: Extracts recipes in their original language without translation
- **Docker Ready**: Containerized deployment with runtime configuration

## Quick Start

### Prerequisites

- Node.js 16+ (for local development)
- Docker (for containerized deployment)
- Google Gemini API key
- Tandoor Recipe Manager instance (optional, for direct uploads)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TandoorRecipeMigration
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   Create a `.env.local` file in the project root:
   ```env
   VITE_API_KEY=your_gemini_api_key
   VITE_TANDOOR_API_KEY=your_tandoor_token
   VITE_TANDOOR_ORIGIN=https://your-tandoor.com
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   Navigate to `http://localhost:5173`

### Docker Deployment

1. **Build the image**
   ```bash
   docker build -t recipe-migrator .
   ```

2. **Run the container**
   ```bash
   docker run -p 80:80 \
     -e API_KEY=your_gemini_api_key \
     -e TANDOOR_API_KEY=your_tandoor_token \
     -e TANDOOR_ORIGIN=https://your-tandoor.com \
     recipe-migrator
   ```

3. **Access the app**
   Open `http://localhost` in your browser

### Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  recipe-migrator:
    build: .
    ports:
      - "80:80"
    environment:
      - API_KEY=your_gemini_api_key
      - TANDOOR_API_KEY=your_tandoor_token
      - TANDOOR_ORIGIN=https://your-tandoor.com
    restart: unless-stopped
```

Run with:
```bash
docker-compose up -d
```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_KEY` | Google Gemini API key for recipe extraction | `AIzaSy...` |
| `TANDOOR_API_KEY` | Tandoor authentication token (Bearer token) | `Token 1234...` |
| `TANDOOR_ORIGIN` | Full URL to your Tandoor instance | `https://tandoor.example.com` |

### Getting API Keys

**Google Gemini API Key:**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create or select a project
3. Generate an API key
4. Copy the key to your environment configuration

**Tandoor API Key:**
1. Log into your Tandoor instance
2. Navigate to Settings → API Tokens
3. Generate a new token
4. Copy the token (format: `Token <token_value>`)

## Usage

1. **Upload Files**: Drag and drop or click to upload recipe files (images, PDFs, TXT, DOCX)
2. **Process Queue**: Click "Process All" to start AI extraction
3. **Review Recipes**: Each extracted recipe appears in the editor for review
4. **Edit as Needed**: Modify ingredients, steps, servings, times, or keywords
5. **Export**:
   - Click "Upload to Tandoor" to send directly to your Tandoor instance
   - Click "Download JSON" to save the recipe locally

## Supported File Formats

- **Images**: PNG, JPG, JPEG, WEBP
- **Documents**: PDF, TXT, DOCX
- **Maximum Size**: Limited by browser memory (typically 10-20MB per file)

## Technical Details

### Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **AI Service**: Google Gemini 3 Pro with structured output
- **State Management**: React hooks (no external state library)
- **Proxy**: Nginx reverse proxy for CORS-free Tandoor integration
- **Containerization**: Multi-stage Docker build with runtime environment injection

### CORS-Free Design

The app uses an nginx reverse proxy to avoid CORS issues:
- Browser requests go to `/tandoor-api/api/recipe/`
- Nginx forwards to `$TANDOOR_ORIGIN/api/recipe/`
- API keys are handled server-side, never exposed to the browser

### Data Flow

1. Files uploaded and added to queue
2. Sequential processing through Gemini API
3. Structured recipe extraction using predefined schema
4. User review and editing
5. Export to Tandoor or JSON download

## Development

### Build Commands

```bash
npm run dev      # Start development server
npm run build    # Build production bundle
npm run preview  # Preview production build locally
```

### Project Structure

```
├── App.tsx                    # Main app logic and state management
├── components/
│   └── RecipeReview.tsx       # Recipe editor component
├── services/
│   └── geminiService.ts       # Gemini AI integration
├── types.ts                   # TypeScript interfaces
├── index.tsx                  # React entry point
├── vite.config.ts             # Vite configuration
├── Dockerfile                 # Container build instructions
├── docker-entrypoint.sh       # Runtime environment injection
├── nginx.conf                 # Nginx server configuration
└── package.json               # Dependencies and scripts
```

## Troubleshooting

### API Key Issues

**Error**: "API key not configured"
- **Solution**: Ensure environment variables are properly set in `.env.local` (dev) or Docker environment (production)

### Tandoor Upload Fails

**Error**: 401 Unauthorized
- **Solution**: Verify your `TANDOOR_API_KEY` is correct and includes the "Token" prefix

**Error**: 400 Bad Request
- **Solution**: Your Tandoor instance may require pre-existing Food/Unit entries. Try disabling strict mode in Tandoor settings.

### Recipe Extraction Issues

**Error**: "Failed to extract recipe"
- **Solution**: Ensure the file contains a clear, readable recipe. Try with a different file format or higher quality image.

### CORS Errors (Local Development)

- **Solution**: The nginx proxy is only available in Docker. For local development, you may need to configure Tandoor's CORS settings or use the JSON download feature.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Add your license information here]

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Acknowledgments

- Google Gemini AI for recipe extraction
- Tandoor Recipe Manager for recipe management
- React and Vite communities
