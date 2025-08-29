import React, { useContext } from 'react';
import { FaRegCalendarAlt, FaArrowRight, FaSignOutAlt } from 'react-icons/fa'; // Added FaSignOutAlt for logout icon
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
    <header className="relative z-40 w-full bg-gradient-to-r from-primary to-blue-700 shadow-lg text-primary-foreground p-4 sm:p-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <FaRegCalendarAlt className="text-3xl sm:text-4xl" />
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">VoiceCalendar</span>
      </div>
      <button
        onClick={handleLogin}
        className="px-4 py-2 sm:px-6 sm:py-3 bg-primary-foreground text-primary rounded-full font-semibold shadow-md hover:shadow-lg transition-all duration-300 ease-in-out flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-75 transform hover:scale-105"
      >
        {isAuthenticated ? (
          <>
            <FaSignOutAlt className="text-lg" />
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
