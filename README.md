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
- **Modern UI** - Clean, professional interface with smooth animations
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
   cd "c:\Users\risha\python-dir\KnowledgeBase\ChatUI"
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

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3

# Development Settings
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
```

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

The FastAPI application on port `8000` must allow requests from the Vite development origin:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Without this middleware, browsers will block frontend chat requests even when the backend endpoint works directly.

## Document Upload (Supabase Storage)

The sidebar **Docs** tab supports uploading PDF, TXT, and Word documents. Files are stored in Supabase Storage via the FastAPI backend in [`backend/`](backend/).

### Supabase setup (one-time)

1. Create a free project at [supabase.com](https://supabase.com)
2. In **Storage**, create a private bucket named `documents`
3. Run the SQL in [`backend/supabase/schema.sql`](backend/supabase/schema.sql) in the Supabase SQL Editor
4. Copy your **Project URL** and **service role key** from Settings → API

### Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env with your Supabase credentials
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend usage

1. Start the backend on port `8000`
2. Start the frontend with `npm run dev`
3. Open the sidebar, go to **Docs**, and click **Upload**

Accepted file types: `.pdf`, `.txt`, `.doc`, `.docx` (max 10 MB).

## 📁 Project Structure

```
src/
├── components/          # React components (organized by feature)
│   ├── chat/                # Chat-related components
│   │   ├── ChatContainer.tsx    # Main chat interface
│   │   ├── Message.tsx          # Individual message component
│   │   ├── LoadingDots.tsx      # Loading animation
│   │   └── index.ts             # Chat components barrel export
│   ├── layout/              # Layout and structural components
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   ├── ErrorBoundary.tsx    # Error handling wrapper
│   │   └── index.ts             # Layout components barrel export
│   ├── ui/                  # Reusable UI components
│   │   ├── ConnectionStatus.tsx # API status indicator
│   │   └── index.ts             # UI components barrel export
│   └── index.ts             # Main components barrel export
├── hooks/               # Custom React hooks
│   ├── useAutoResize.ts     # Auto-resizing textarea hook
│   ├── useDebounce.ts       # Debouncing hook
│   └── index.ts             # Hooks barrel export
├── utils/               # Utility functions
│   └── index.ts             # Validation, formatting, helper functions
├── constants/           # Application constants
│   └── index.ts             # Configuration constants and enums
├── services/            # API service layer
│   └── chatService.ts       # FastAPI integration
├── types/              # TypeScript definitions
│   └── chat.ts              # Chat-related types
├── config/             # Configuration
│   └── api.ts               # API configuration
├── styles/             # Global styles
│   ├── App.css              # Component styles
│   └── index.css            # Global styles
└── assets/             # Static assets
    └── react.svg            # Icons and images
```

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

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

- [ ] Message persistence with local storage
- [x] File upload support
- [ ] Voice message integration
- [ ] Multi-language support
- [ ] Theming system
- [ ] Plugin architecture
- [ ] Advanced markdown rendering
- [ ] Message search functionality

---

**Built with ❤️ using React, TypeScript, and TailwindCSS**
