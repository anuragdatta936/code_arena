# CodeArena Frontend Plan - React with Monaco Editor

## Overview
This document outlines the structure and implementation plan for the React frontend of CodeArena, featuring Monaco editor integration for an optimal coding experience.

## Technology Stack
- **Framework**: React 18 with TypeScript
- **Editor**: Monaco Editor (the editor that powers VS Code)
- **State Management**: React Query (for server state) + Context API/Zustand (for client state)
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios or Fetch API
- **Build Tool**: Vite (for faster development experience)

## Project Structure
```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   ├── editor/
│   │   │   ├── MonacoEditor.tsx
│   │   │   └── EditorToolbar.tsx
│   │   ├── problem/
│   │   │   ├── ProblemList.tsx
│   │   │   ├── ProblemCard.tsx
│   │   │   └ problemDetail/
│   │   │       ├── ProblemDetail.tsx
│   │   │       ├── TestCasesPanel.tsx
│   │   │       └ EditorWrapper.tsx
│   │   ├── submission/
│   │   │   ├── SubmissionForm.tsx
│   │   │   ├── SubmissionStatus.tsx
│   │   │   └ SubmissonHistory.tsx
│   │   └ ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       └ Modal.tsx
│   ├── hooks/
│   │   ├── useProblems.ts
│   │   ├── useSubmissions.ts
│   │   └ useAuth.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Problems.tsx
│   │   ├── ProblemDetail.tsx
│   │   ├── Editor.tsx
│   │   ├── Submit.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   └ Profile.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └ authService.ts
│   ├── store/
│   │   └ index.ts (if using Zustand or similar)
│   ├── styles/
│   │   └ globals.css
│   ├── utils/
│   │   ├── constants.ts
│   │   └ helpers.ts
│   ├── App.tsx
│   └ main.tsx
├── .env.vite
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Key Components

### 1. Monaco Editor Integration
- Create a reusable `MonacoEditor.tsx` component that wraps the Monaco editor
- Features:
  - Language selection (Python, Java, C++ - matching backend support)
  - Theme support (light/dark)
  - Auto-completion and syntax highlighting
  - Line numbers and minimap
  - Custom keybindings for common actions (Ctrl+S to save, etc.)
  - Error diagnostics integration

### 2. Problem Catalog Pages
- **Problems Page** (`/problems`):
  - List of all problems with filtering by difficulty/tags
  - Problem cards showing title, difficulty, tags, and submission stats
  - Pagination or infinite scroll
  
- **Problem Detail Page** (`/problems/:id`):
  - Full problem description
  - Sample test cases
  - Editor panel with Monaco editor
  - Submit button
  - Test case execution area

### 3. Submission System
- **Submit Page** (`/submit/:problemId`):
  - Pre-loaded problem in editor
  - Language selector
  - Code editor with Monaco
  - Submit button
  - Loading state while processing
  
- **Submission Status**:
  - Real-time updates via polling or WebSocket (future enhancement)
  - Shows verdict (Accepted, Wrong Answer, etc.)
  - Runtime and memory usage
  - Detailed test case results

### 4. User Authentication
- Integrate with existing JWT auth system
- Protected routes for submission and profile
- Login/Register pages
- User profile showing rating, submission history, etc.

## API Integration
The frontend will interact with the existing backend endpoints:

### Problems API
- `GET /api/problems` - Get list of problems (with pagination)
- `GET /api/problems/:id` - Get problem by ID
- `GET /api/problems/:id/testcases` - Get test cases for a problem

### Submissions API
- `POST /api/submissions` - Create a new submission
- `GET /api/submissions/:id` - Get submission by ID
- `GET /api/submissions` - Get user's submissions

### Auth API (existing)
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/refresh` - Refresh access token
- `POST /api/logout` - Logout user

## Monaco Editor Specifics
### Installation
```bash
npm install @monaco-editor/react
```

### Usage Pattern
```tsx
import { MonacoEditor } from '@monaco-editor/react';

const Editor = ({ language, code, onChange }) => {
  return (
    <MonacoEditor
      height="100%"
      defaultLanguage={language}
      value={code}
      onChange={onChange}
      theme="vs-dark" // or 'light'
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        tabSize: 2,
        wrapEnabled: false,
        automaticLayout: true,
      }}
    />
  );
};
```

### Language Configuration
Monaco needs to be configured for our supported languages:
- Python: `python`
- Java: `java`
- C++: `cpp`

We may need to load additional language configurations if not built-in.

## State Management Approach
1. **Server State** (React Query):
   - Problems data
   - Submission data
   - User profile data
   
2. **Client State** (Context API or Zustand):
   - Editor state (current code, language)
   - UI state (sidebar collapse, theme)
   - Authentication state

## Styling Approach
- Tailwind CSS for utility-first styling
- Custom components library for consistent UI
- Dark/Light theme support
- Responsive design for different screen sizes

## Development Workflow
1. Set up Vite + React + TypeScript project
2. Configure Tailwind CSS
3. Set up React Router
4. Implement authentication context/service
5. Create basic layout (header, footer, main)
6. Implement Monaco editor wrapper component
7. Build problem listing page
8. Build problem detail page with editor integration
9. Implement submission flow
10. Add user profile and authentication pages
11. Add testing (unit/component tests)
12. Optimize performance and bundle size

## Dependencies
### Core
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "@monaco-editor/react": "^4.4.0",
    "axios": "^1.3.0",
    "tailwindcss": "^3.2.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@typescript-eslint/eslint-plugin": "^5.0.0",
    "@typescript-eslint/parser": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-react": "^7.30.0",
    " typescript": "^4.9.0",
    "vite": "^4.0.0",
    "@vitejs/plugin-react": "^3.0.0"
  }
}
```

## Future Enhancements
1. Real-time submission updates via WebSockets
2. Code execution playground (local execution without submission)
3. User ratings and leaderboard integration
4. Problem creation/edit interface (for admins)
5. Discussion forums for each problem
6. AI-powered code hints/explanations
7. Multi-language support beyond initial 3 languages
8. Contest mode with real-time ranking
9. Plagiarism similarity viewing (for instructors)

## Implementation Priorities (Week 4-5)
1. Set up project infrastructure (Vite, React, TypeScript, Tailwind)
2. Implement authentication integration with backend
3. Create Monaco editor wrapper component
4. Build problem listing and detail pages
5. Implement submission flow with editor
6. Create basic user profile page
7. Ensure responsive design and proper error handling

This plan provides a solid foundation for the CodeArena frontend that can be iteratively enhanced in subsequent weeks.