# CodeArena Frontend

This is the React frontend for the CodeArena platform, featuring Monaco editor integration for an optimal coding experience.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Features Implemented

### 1. Monaco Editor Integration
- Created a reusable `MonacoEditor.tsx` component that wraps the Monaco editor
- Supports multiple languages (Python, Java, C++)
- Theme support (light/dark)
- Configurable editor options (font size, tab size, minimap, etc.)

### 2. Project Setup
- Vite + React + TypeScript template
- Tailwind CSS for styling
- React Router for navigation
- Basic page structure with editor demonstration

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:5173`

## Project Structure

```
frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/
│   │   └── editor/
│   │       └── MonacoEditor.tsx     # Monaco editor wrapper component
│   ├── pages/
│   │   └── Editor.tsx               # Demo page showcasing the editor
│   ├── App.tsx                      # Main app with routing
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Tailwind CSS imports
└── ...
```

## Monaco Editor Component

The `MonacoEditor` component provides a flexible wrapper around the Monaco editor with the following props:

- `language`: Programming language ("python", "java", "cpp")
- `value`: Initial code value
- `onChange`: Callback when code changes
- `theme`: Editor theme ("light" or "dark")
- Plus various editor configuration options

## Future Enhancements

- Problem listing and detail pages
- Submission flow integration
- User authentication
- Real-time submission updates
- Code execution playground

---
*This frontend is designed to work with the CodeArena backend API.*
