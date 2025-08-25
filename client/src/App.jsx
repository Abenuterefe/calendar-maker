import React, { useContext } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import InputArea from './components/InputArea';
import { AuthContext } from './context/AuthContext';

function App() {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="flex flex-col min-h-screen items-center justify-center">Loading authentication...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <div className={`flex-grow flex flex-col ${isAuthenticated ? 'pb-20' : ''}`}> {/* Add conditional padding-bottom */}
        <HeroSection isAuthenticated={isAuthenticated} />
      </div>
      {isAuthenticated && <InputArea />}
    </div>
  );
}

export default App;
