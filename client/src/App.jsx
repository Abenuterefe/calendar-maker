import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // Import routing components
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import InputArea from './components/InputArea';
import { AuthContext } from './context/AuthContext';

// Create a HomePage component to encapsulate main content sections
const HomePage = () => {
  const { isAuthenticated } = useContext(AuthContext);
  return (
    <div className="flex flex-col flex-grow">
      <HeroSection isAuthenticated={isAuthenticated} />
      <FeaturesSection />
    </div>
  );
};

function App() {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center text-foreground bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Add more routes here if needed */}
        </Routes>
        {isAuthenticated && <InputArea />}
        <footer className="bg-card text-muted-foreground py-6 text-center mt-auto border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm">&copy; {new Date().getFullYear()} VoiceCalendar. All rights reserved.</p>
            <p className="text-xs mt-2">Simplify your schedule with intelligent voice and text commands.</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
