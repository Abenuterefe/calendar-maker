import React, { useContext, useState } from 'react';
import { FaRegCalendarAlt } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext

const HeroSection = ({ isAuthenticated }) => {
  const { login } = useContext(AuthContext); // Use AuthContext to get login function
  const [showLearnMore, setShowLearnMore] = useState(false); // State for Learn More pop-up

  const handleGetStarted = () => {
    login(); // Call login function
  };

  const handleLearnMore = () => {
    setShowLearnMore(true);
  };

  const handleCloseLearnMore = () => {
    setShowLearnMore(false);
  };

  return (
    <section className="flex flex-col items-center justify-center flex-grow p-4 text-center bg-white text-gray-900">
      {/* Calendar icon with sparkle */}
      <div className="relative mb-10 mt-16">
        <FaRegCalendarAlt className="text-8xl text-gray-800" />
        <span className="absolute top-0 right-0 -mt-3 -mr-3 text-3xl animate-pulse text-yellow-500">✨</span>
      </div>
      <h1 className="text-6xl font-extrabold mb-6 leading-tight">Make Your Calendar in a Second</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-3xl leading-relaxed">
        Create calendar events effortlessly using your voice or text. Just speak naturally
        or type your plans, and we'll handle the rest.
      </p>
      <div className="flex space-x-4 mb-8">
        {!isAuthenticated && (
          <button
            onClick={handleGetStarted} // Attach handler
            className="px-8 py-4 bg-gray-900 text-white rounded-xl flex items-center space-x-3 text-lg font-semibold shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
          >
            <FaRegCalendarAlt className="text-xl" />
            <span>Get Started</span>
          </button>
        )}
        <button
          onClick={handleLearnMore} // Attach handler
          className="px-8 py-4 border border-gray-300 text-gray-800 rounded-xl text-lg font-semibold shadow-md transition-transform transform hover:scale-105 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50"
        >
          Learn More
        </button>
      </div>

      {/* Learn More Pop-up (Modal) */}
      {showLearnMore && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full m-4 relative">
            <button
              onClick={handleCloseLearnMore}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none focus:outline-none"
            >
              &times;
            </button>
            <h2 className="text-3xl font-bold mb-4 text-gray-900">How to Use VoiceCalendar</h2>
            <p className="text-gray-700 mb-4">
              VoiceCalendar allows you to create and manage Google Calendar events using natural language.
              Simply type or speak your request, and our AI will handle the rest.
            </p>
            <h3 className="text-2xl font-semibold mb-2 text-gray-800">Key Features:</h3>
            <ul className="list-disc list-inside text-left text-gray-700 mb-4 space-y-1">
              <li>Create one-time events: "Schedule a meeting tomorrow at 3 PM about project launch."</li>
              <li>Create recurring events: "Set up a daily reminder for 9 AM for the next 5 days to check emails."</li>
              <li>View upcoming events: "What's on my calendar today?" or "Show me events for next week."</li>
            </ul>
            <p className="text-gray-700">
              Get started by logging in with your Google account and speaking or typing your first calendar command!
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
