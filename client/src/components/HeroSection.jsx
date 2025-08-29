import React, { useContext, useState } from 'react';
import { FaRegCalendarAlt } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const HeroSection = ({ isAuthenticated }) => {
  const { login } = useContext(AuthContext);
  const [showLearnMore, setShowLearnMore] = useState(false);

  const handleGetStarted = () => {
    login();
  };

  const handleLearnMore = () => {
    setShowLearnMore(true);
  };

  const handleCloseLearnMore = () => {
    setShowLearnMore(false);
  };

  return (
    <section className="relative bg-gradient-to-br from-background via-blue-50 to-background text-foreground py-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] text-center overflow-hidden">
      {/* Background blobs for visual interest */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Calendar icon with sparkle */}
        <div className="relative mb-8">
          <FaRegCalendarAlt className="text-8xl sm:text-9xl text-primary mx-auto animate-bounce-slow" />
          <span className="absolute top-0 right-0 -mt-3 -mr-3 text-4xl animate-pulse text-accent">✨</span>
        </div>
        <h1 className="text-5xl sm:text-7xl font-extrabold mb-6 leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-primary">
        Talk or Type. Get Your Calendar Done.
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Transform your voice and text commands into perfectly organized Google Calendar events. Effortless scheduling, powered by AI.
        </p>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-12 justify-center">
          {!isAuthenticated && (
            <button
              onClick={handleGetStarted}
              className="px-10 py-4 bg-primary text-primary-foreground rounded-full text-xl font-bold shadow-lg hover:shadow-xl transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50"
            >
              Get Started
            </button>
          )}
          <button
            onClick={handleLearnMore}
            className="px-10 py-4 border-2 border-primary text-primary rounded-full text-xl font-bold bg-transparent shadow-md hover:bg-primary hover:text-primary-foreground hover:shadow-xl transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50"
          >
            Learn More
          </button>
        </div>
      </div>

      {/* Learn More Pop-up (Modal) */}
      {showLearnMore && (
        <div className="fixed inset-0 bg-background bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card text-card-foreground p-8 rounded-2xl shadow-2xl max-w-md w-full m-4 relative border border-border transform transition-all scale-100 opacity-100 ease-out duration-300">
            <button
              onClick={handleCloseLearnMore}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-3xl font-bold leading-none focus:outline-none"
            >
              &times;
            </button>
            <h2 className="text-4xl font-extrabold mb-4 text-primary">How VoiceCalendar Works</h2>
            <p className="text-lg text-muted-foreground mb-6">
              VoiceCalendar intelligently transforms your natural language into Google Calendar events and insights.
            </p>
            <h3 className="text-2xl font-bold mb-3 text-foreground">Key Capabilities:</h3>
            <ul className="list-disc list-inside text-left text-muted-foreground mb-6 space-y-2 text-lg">
              <li><span className="font-semibold">Create Events:</span> "Schedule a meeting for tomorrow at 3 PM about project launch."</li>
              <li><span className="font-semibold">Recurring Events:</span> "Set a daily reminder for 9 AM for the next 5 days to check emails."</li>
              <li><span className="font-semibold">View Schedule:</span> "What's on my calendar today?" or "Show me events for next week."</li>
            </ul>
            <p className="text-lg text-foreground">
              Connect your Google account and experience the future of personal scheduling!
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
