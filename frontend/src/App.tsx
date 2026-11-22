import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { SmartSearch } from './pages/SmartSearch';
import { VisualMemory } from './pages/VisualMemory';
import { MyFiles } from './pages/MyFiles';
import { MyTimeline } from './pages/MyTimeline';
import { Projects } from './pages/Projects';
import { ProjectReconstruction } from './pages/ProjectReconstruction';
import { AIAssistant } from './pages/AIAssistant';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="flex h-screen bg-porcelain-100 text-charcoal dark:bg-onyx-400 dark:text-porcelain-100 overflow-hidden font-sans">
          {/* Collapsible Sidebar */}
          <Sidebar />

          {/* Main Workspace Frame */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header />

            {/* Scrollable Viewport with Ambient Outer Glow Accent */}
            <main className="flex-1 overflow-y-auto px-6 md:px-10 py-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/search" element={<SmartSearch />} />
                <Route path="/visual" element={<VisualMemory />} />
                <Route path="/files" element={<MyFiles />} />
                <Route path="/timeline" element={<MyTimeline />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/reconstruction" element={<ProjectReconstruction />} />
                <Route path="/assistant" element={<AIAssistant />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
