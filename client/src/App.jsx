import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PollListPage } from './pages/PollListPage';
import { PollDetailPage } from './pages/PollDetailPage';
import { CreatePollPage } from './pages/CreatePollPage';
import { ResultsPage } from './pages/ResultsPage';
import { MyPollsPage } from './pages/MyPollsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes */}
              <Route
                path="/polls"
                element={
                  <ProtectedRoute>
                    <PollListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/polls/create"
                element={
                  <ProtectedRoute>
                    <CreatePollPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/polls/:id"
                element={
                  <ProtectedRoute>
                    <PollDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/polls/:id/results"
                element={
                  <ProtectedRoute>
                    <ResultsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-polls"
                element={
                  <ProtectedRoute>
                    <MyPollsPage />
                  </ProtectedRoute>
                }
              />

              {/* Default Redirects & 404 */}
              <Route path="/" element={<Navigate to="/polls" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

