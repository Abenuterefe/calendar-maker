import React, { useContext } from 'react';
import { FaRegCalendarAlt, FaArrowRight } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const Header = () => {
  const { login, isAuthenticated, logout, user } = useContext(AuthContext);

  const handleLogin = () => {
    if (isAuthenticated) {
      logout();
    } else {
      login();
    }
  };

  return (
    <header className="flex items-center justify-between p-6 bg-white shadow-sm">
      <div className="flex items-center space-x-3">
        <FaRegCalendarAlt className="text-2xl text-gray-800" />
        <span className="text-2xl font-semibold text-gray-800">VoiceCalendar</span>
      </div>
      <button
        onClick={handleLogin}
        className="px-5 py-2 bg-gray-900 text-white rounded-lg flex items-center space-x-2 transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
      >
        {isAuthenticated ? (
          <>
            <span>Logout</span>
          </>
        ) : (
          <>
            <FaArrowRight className="text-lg" />
            <span>Login</span>
          </>
        )}
      </button>
    </header>
  );
};

export default Header;
