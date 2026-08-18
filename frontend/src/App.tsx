import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Editor from './pages/Editor';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Submit from './pages/Submit';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Routes>
          {/* Redirect root to problems page */}
          <Route path="/" element={<Navigate to="/problems" replace />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/:id" element={<ProblemDetail />} />
          <Route path="/submit/:problemId" element={<Submit />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/editor" element={<Editor />} />
          {/* Other routes will go here as we implement them */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;