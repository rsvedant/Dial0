# DialZero

<div align="center">
  <img src="./public/DialZero.svg" alt="DialZero Logo" width="200" height="80" />
  
  **Automate your customer service calls, so you never have to hop on call ever again.**
  
  [![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Convex](https://img.shields.io/badge/Convex-1.27.0-orange?style=flat-square)](https://convex.dev/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1.9-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
</div>

## 🎯 What is DialZero?

DialZero is an intelligent customer service automation platform that handles your customer support calls using advanced AI technology. Our platform combines voice AI, natural language processing, and smart routing to ensure your customers get the help they need without you ever having to pick up the phone.

### Key Features

- 🤖 **AI-Powered Voice Assistants** - Custom voice cloning and intelligent conversation handling
- 📞 **Automated Call Management** - Complete call lifecycle management with real-time transcription
- 🎤 **Custom Voice Creation** - Clone your voice for personalized customer interactions
- 💬 **Intelligent Chat Interface** - Seamless conversation flow with context awareness
- 📊 **Real-time Analytics** - Live call monitoring and comprehensive reporting
- 🔍 **Smart Knowledge Base** - Powered by Inkeep for accurate, context-aware responses
- 📱 **Responsive Design** - Works seamlessly across desktop and mobile devices

## 🚀 Technology Stack

### Frontend
- **[Next.js 15.5.3](https://nextjs.org/)** - React framework with App Router
- **[React 18](https://reactjs.org/)** - Modern React with hooks and concurrent features
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS 4.1.9](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[Lucide React](https://lucide.dev/)** - Beautiful & consistent icons
- **[Next Themes](https://github.com/pacocoursey/next-themes)** - Perfect dark mode support

### Backend & Database
- **[Convex](https://convex.dev/)** - Real-time backend-as-a-service with live queries
- **[Convex Actions](https://docs.convex.dev/functions/actions)** - Server-side functions for external API integration

### AI & Voice Technology
- **[Vapi AI](https://vapi.ai/)** - Voice AI platform for call automation and voice cloning
- **[ElevenLabs](https://elevenlabs.io/)** - Advanced voice synthesis (via Vapi integration)
- **[Inkeep](https://inkeep.com/)** - AI-powered knowledge base and customer support
- **[OpenAI GPT](https://openai.com/)** - Natural language processing and chat completions
- **[Google Generative AI](https://ai.google.dev/)** - Additional AI capabilities
- **[Anthropic Claude](https://www.anthropic.com/)** - Advanced language model integration

### Real-time Features
- **WebRTC** - Real-time audio recording and processing
- **MediaRecorder API** - Browser-native audio recording
- **Real-time Transcription** - Live call transcription and analysis
- **Live Updates** - Real-time UI updates via Convex subscriptions

### Development Tools
- **[Geist Font](https://vercel.com/font)** - Modern, clean typography
- **[Sonner](https://sonner.emilkowal.ski/)** - Beautiful toast notifications
- **[React Hook Form](https://react-hook-form.com/)** - Performant forms with validation
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation
- **[Concurrently](https://github.com/open-cli-tools/concurrently)** - Run multiple commands concurrently

## 🏗️ Architecture

DialZero follows a modern, scalable architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│  Convex Backend │────│   External APIs │
│                 │    │                 │    │                 │
│ • React UI      │    │ • Real-time DB  │    │ • Vapi AI       │
│ • TypeScript    │    │ • Actions       │    │ • Inkeep        │
│ • Tailwind CSS  │    │ • Live Queries  │    │ • OpenAI        │
│ • Voice Recording    │ • Webhooks      │    │ • ElevenLabs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Components

1. **Voice Management** - Custom voice cloning and audio processing
2. **Call Orchestration** - Intelligent call routing and management
3. **Real-time Chat** - Live conversation interface with AI assistance
4. **Issue Tracking** - Comprehensive customer issue management
5. **Settings Management** - User preferences and configuration
6. **Analytics Dashboard** - Call performance and insights

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Convex account
- Vapi AI account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DialZero
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Convex
   NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
   
   # Vapi AI
   VAPI_PRIVATE_API_KEY=your_vapi_private_key
   VAPI_ORG_ID=your_vapi_org_id
   
   # Inkeep
   INKEEP_API_KEY=your_inkeep_api_key
   
   # OpenAI (optional)
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Set up Convex**
   ```bash
   npx convex dev
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 Features in Detail

### Voice Cloning
- **Custom Voice Creation**: Record a 45-60 second sample to clone your voice
- **Cross-browser Compatibility**: Works on desktop and mobile browsers
- **Permission Management**: Intelligent microphone permission handling
- **Audio Quality**: High-quality recording with noise suppression

### Call Automation
- **Intelligent Routing**: AI-powered call classification and routing
- **Real-time Transcription**: Live conversation transcription and analysis
- **Call Lifecycle Management**: Complete call flow from start to resolution
- **Webhook Integration**: Real-time updates via Vapi webhooks

### Knowledge Base Integration
- **Inkeep Integration**: AI-powered knowledge base for accurate responses
- **Context-Aware Responses**: Intelligent answers based on your documentation
- **Multi-model Support**: Various AI models for different use cases
- **RAG Implementation**: Retrieval-Augmented Generation for precise answers

### User Experience
- **Responsive Design**: Optimized for all screen sizes
- **Dark Mode Support**: Beautiful dark/light theme switching
- **Real-time Updates**: Live UI updates without page refreshes
- **Accessibility**: Built with accessibility in mind using Radix UI

## 🔧 Configuration

### Convex Schema
The project uses a comprehensive database schema including:
- **Issues**: Customer issue tracking and management
- **Settings**: User preferences and configuration
- **Chat Messages**: Conversation history and context
- **Call Events**: Real-time call data and transcriptions
- **Orchestration Contexts**: AI-generated context and summaries

### API Routes
- `/api/chat` - AI-powered chat completions
- `/api/vapi/webhook` - Vapi call event handling
- `/api/vapi/start-call` - Call initiation
- `/api/voice/clone` - Voice cloning endpoints
- `/api/inkeep` - Knowledge base integration

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel**
   ```bash
   vercel --prod
   ```

2. **Configure Environment Variables**
   Add all required environment variables in the Vercel dashboard

3. **Deploy Convex Backend**
   ```bash
   npx convex deploy
   ```

### Other Platforms
The project can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Inkeep](https://inkeep.com/)** - For providing intelligent knowledge base capabilities
- **[Vapi AI](https://vapi.ai/)** - For voice AI and call automation technology
- **[Convex](https://convex.dev/)** - For the real-time backend infrastructure
- **[Vercel](https://vercel.com/)** - For seamless deployment and hosting
- **[Radix UI](https://www.radix-ui.com/)** - For accessible component primitives

---

<div align="center">
  <p>Built with ❤️ by the DialZero team</p>
</div>
