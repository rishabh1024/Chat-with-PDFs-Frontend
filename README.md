# AI Chatbot Frontend

A modern, responsive React TypeScript frontend for AI chatbot applications with FastAPI backend integration. Built with Vite, TailwindCSS, and featuring a sleek red, black, and purple color scheme.

![AI Chatbot Interface](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue) ![Vite](https://img.shields.io/badge/Vite-6.3-green) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan)

## ✨ Features

### 🎯 **Core Functionality**
- **Real-time Chat Interface** - Smooth, scrollable chat with message history
- **FastAPI Integration** - Seamless connection to Python FastAPI backend
- **Message Management** - Persistent chat history with timestamps
- **Loading States** - Elegant loading animations and status indicators

### 🛡️ **Reliability & Error Handling**
- **Robust Error Handling** - Comprehensive error catching with user-friendly messages
- **Retry Mechanism** - Automatic and manual retry options for failed requests
- **Connection Status** - Real-time API health monitoring with visual indicators
- **Request Timeouts** - Configurable timeout handling (30s default)
- **Error Boundaries** - Application-wide error recovery

### 💬 **Enhanced Chat Experience**
- **Auto-resizing Input** - Smart textarea that grows with content
- **Character Limits** - 4000 character limit with real-time counter
- **Keyboard Shortcuts** - Enter to send, Shift+Enter for new lines, Esc to clear errors
- **Message Validation** - Input sanitization and validation
- **Visual Feedback** - Loading dots, character counts, and status indicators

### 📱 **Responsive Design**
- **Mobile-First** - Fully responsive design for all screen sizes
- **Sidebar Navigation** - Collapsible sidebar with chat history, prompts, documents, and tools
- **Modern UI** - Clean, professional interface with smooth **animations**
- **Accessibility** - ARIA labels, keyboard navigation, and screen reader support

### ⚙️ **Configuration & Performance**
- **Environment Configuration** - Configurable API endpoints and settings
- **Performance Optimized** - React.memo implementation and efficient re-renders
- **TypeScript** - Full type safety throughout the application
- **Modular Architecture** - Clean separation of concerns and reusable components

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- FastAPI backend running on `localhost:8000` (or configured endpoint)

### Installation

1. **Clone and navigate to the project**
   ```powershell
   git clone <your-repo-url>
   cd AChatUI
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Configure environment** (optional)
   ```powershell
   Copy-Item .env.example .env
   # Edit .env with your API settings
   ```

4. **Start development server**
   ```powershell
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## Deploy on Render

This app is a Vite SPA. Host it as a **Static Site** (not a Web Service). `VITE_*` values are baked into the bundle at **build time**; changing them requires a redeploy.

### Option A: Blueprint (`render.yaml`)

1. Push this repo to GitHub or GitLab
2. In the [Render Dashboard](https://dashboard.render.com), create a new Blueprint and select the repo
3. Set `VITE_API_BASE_URL` to your FastAPI URL (for example `https://chat-with-your-pdfs.onrender.com`)
4. Apply the Blueprint

The Blueprint uses:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Rewrite: `/*` → `/index.html`

### Option B: Dashboard Static Site

| Setting | Value |
|---|---|
| Runtime | Static Site |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Rewrite | Source `/*` → Destination `/index.html` |

Environment variables (Environment tab):

```env
VITE_API_BASE_URL=https://your-fastapi-service.onrender.com
VITE_API_TIMEOUT=120000
VITE_API_RETRY_ATTEMPTS=3
```

After the frontend URL exists, add that origin to FastAPI `CORSMiddleware` `allow_origins` and confirm chat plus document upload against the live API.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`). Do not commit `.env` or `.env.production`.

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# Development Settings
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
```

On Render, set the same `VITE_*` keys in the service Environment tab instead of committing production values.

### API Endpoints

The frontend expects the following FastAPI endpoints:

- `POST /chat/conversation/{chat_id}/messages/?message_query=<text>` - Send a chat message
  
- `GET /health` - Health check (optional)
- `GET /documents` - List uploaded documents
- `POST /documents` - Upload a document (`multipart/form-data`)
- `DELETE /documents/{id}` - Delete a document

The frontend generates and stores `chat_id` in browser `localStorage`. The chat response must match:

```json
{
  "chat_id": "123e4567-e89b-12d3-a456-426614174000",
  "ai_message": "AI response here",
  "chat_history_messages": ["User message", "AI response here"]
}
```

### Backend CORS requirement

The FastAPI application must allow requests from the frontend origin. For local development that is `http://localhost:5173`. After you deploy this UI, also include the Render frontend URL:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://achatui.onrender.com",  # replace with your Render frontend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Without this middleware, browsers will block frontend chat requests even when the backend endpoint works directly.

## Document Upload

The sidebar **Docs** tab supports uploading PDF, TXT, and Word documents. Files are stored by the separate FastAPI backend (for example `https://chat-with-your-pdfs.onrender.com`). This frontend repo does not include backend code.

### Frontend usage

1. Point `VITE_API_BASE_URL` at a running FastAPI service
2. Start the frontend with `npm run dev` (or deploy it on Render)
3. Open the sidebar, go to **Docs**, and click **Upload**

Accepted file types: `.pdf`, `.txt`, `.doc`, `.docx` (max 10 MB).

## 📁 Project Structure

```
src/
├── components/          # React components (organized by feature)
│   ├── chat/                # Chat-related components
│   │   ├── ChatContainer.tsx    # Main chat interface
│   │   ├── Message.tsx          # Individual message component
│   │   ├── MarkdownContent.tsx  # Markdown rendering for AI replies
│   │   ├── LoadingDots.tsx      # Loading animation
│   │   └── index.ts
│   ├── layout/              # Layout and structural components
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── ErrorBoundary.tsx    # Error handling wrapper
│   │   └── index.ts
│   └── ui/                  # Reusable UI components
│       ├── ConnectionStatus.tsx
│       └── index.ts
├── hooks/               # Custom React hooks
├── utils/               # Validation, formatting, chat session helpers
│   └── chatSession.ts       # localStorage chat session persistence
├── constants/           # Application constants
├── services/            # API service layer
│   ├── chatService.ts       # Chat FastAPI integration
│   └── documentService.ts   # Document upload/list/delete
├── types/               # TypeScript definitions
│   ├── chat.ts
│   └── document.ts
├── config/              # API configuration (VITE_* env)
├── styles/
├── tests/               # Vitest + Testing Library
└── assets/
```

Deploy config lives at the repo root: `render.yaml`, `.nvmrc`, `.env.example`.

## 🎨 Styling & Theming

### Color Scheme
- **Primary** (Red): `#ef4444` - User messages, buttons, accents
- **Secondary** (Black/Gray): `#0f172a` - Text, backgrounds, borders  
- **Accent** (Purple): `#a855f7` - Highlights, gradients, special elements

### Customization
Colors are defined in `tailwind.config.js` and can be easily customized:

```javascript
colors: {
  primary: {
    500: '#ef4444', // Main red
    // ... other shades
  },
  secondary: {
    900: '#0f172a', // Main black
    // ... other shades
  },
  accent: {
    500: '#a855f7', // Main purple
    // ... other shades
  }
}
```

## 📝 Available Scripts

```powershell
# Development
npm run dev          # Start development server

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🔌 Backend Integration

### FastAPI Setup

Your FastAPI backend should have:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for local and production frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://achatui.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(chat_message: ChatMessage):
    # Your AI logic here
    response = await process_ai_message(chat_message.message)
    return {"message": response}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## 🛠️ Development

### Code Quality Standards
- **TypeScript** - Strict type checking enabled
- **ESLint** - Code linting with React best practices
- **Error Handling** - Comprehensive error boundaries and validation
- **Performance** - Optimized components with React.memo
- **Accessibility** - ARIA labels and keyboard navigation

### Testing Recommendations
- Unit tests for components (Jest + React Testing Library)
- Integration tests for API calls
- E2E testing with Playwright or Cypress
- Manual testing checklist in `CODE_QUALITY_IMPROVEMENTS.md`

## 🚨 Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check if FastAPI backend is running on correct port
   - Verify CORS settings in backend
   - Check network connectivity

2. **Build Errors**
   - Clear node_modules: `Remove-Item -Recurse -Force node_modules; npm install`
   - Check TypeScript errors: `npm run type-check`

3. **Performance Issues**
   - Check for unnecessary re-renders in React DevTools
   - Verify large message history isn't causing slowdowns

### Environment Issues
- Ensure Node.js version is 18+
- Check if ports 5173+ are available
- Verify environment variables are set correctly

## 📖 Additional Documentation

- **[Code Quality Improvements](CODE_QUALITY_IMPROVEMENTS.md)** - Detailed list of improvements and fixes
- **[Component Documentation](src/components/)** - Individual component README files
- **[API Documentation](src/services/)** - Service layer documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Style
- Use TypeScript strict mode
- Follow React best practices
- Implement proper error handling
- Add accessibility features
- Write meaningful commit messages

## 📄 License

This project is licensed under the MIT License.

## 🎯 Roadmap

- [x] Message persistence with local storage
- [x] File upload support
- [ ] Voice message integration
- [ ] Multi-language support
- [ ] Theming system
- [ ] Plugin architecture
- [x] Advanced markdown rendering
- [ ] Message search functionality

---

**Built with ❤️ using React, TypeScript, and TailwindCSS**
