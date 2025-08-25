import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Default to false
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true); // To prevent state updates on unmounted component
  const isRefreshing = useRef(false); // To prevent multiple refresh token requests

  const CLIENT_URL = 'http://localhost:5173'; // From env or config
  const BACKEND_URL = 'http://localhost:5000'; // From env or config

  const checkAuthentication = useCallback(async () => {
    const storedToken = localStorage.getItem('jwtToken');

    if (storedToken) {
      try {
        const response = await axios.get(`${BACKEND_URL}/auth/status`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
        if (response.data.isAuthenticated) {
          setIsAuthenticated(true);
          setUser({ id: response.data.user.id, googleId: response.data.user.googleId });
          return true;
        } else {
          // Token invalid or expired, but not handled by interceptor yet (initial load)
          console.log("Access token invalid on initial check, attempting refresh via interceptor...");
          // The interceptor will handle the actual refresh, so we just return false here
          return false;
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Let the interceptor handle 401s, for other errors, act as unauthenticated
        if (error.response && error.response.status === 401) {
            console.log("401 during initial auth status check, interceptor will try to refresh.");
            return false;
        }
        localStorage.removeItem('jwtToken');
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }
    }
    setIsAuthenticated(false);
    setUser(null);
    return false;
  }, [BACKEND_URL]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (!isMounted.current) return;

      let authenticatedByUrl = false;

      const params = new URLSearchParams(window.location.search);
      const token = params.get('token'); // This is now the access token
      const authStatus = params.get('auth'); // 'failed' or 'error'
      const logoutStatus = params.get('logout'); // 'success'

      if (token || authStatus || logoutStatus) {
        window.history.replaceState({}, document.title, CLIENT_URL);
      }

      if (token) {
        localStorage.setItem('jwtToken', token);
        authenticatedByUrl = true;
      } else if (authStatus === 'failed' || authStatus === 'error') {
        console.error('Authentication failed or encountered an error.');
        localStorage.removeItem('jwtToken');
        setIsAuthenticated(false);
        setUser(null);
      } else if (logoutStatus === 'success') {
        console.log('Logout successful.');
        localStorage.removeItem('jwtToken');
        setIsAuthenticated(false);
        setUser(null);
      }

      if (!authenticatedByUrl) {
        await checkAuthentication();
      }
      setLoading(false);
    };

    initializeAuth();

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If error is 401 (Unauthorized) and it's not a retry after refresh and not the refresh token request itself
        if (error.response && error.response.status === 401 && !originalRequest._retry && originalRequest.url !== `${BACKEND_URL}/auth/refresh-token`) {
          originalRequest._retry = true;
          
          if (!isRefreshing.current) {
            isRefreshing.current = true;
            try {
              const response = await axios.post(`${BACKEND_URL}/auth/refresh-token`, {}, { withCredentials: true });
              const newAccessToken = response.data.accessToken;

              localStorage.setItem('jwtToken', newAccessToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
              originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              
              // After refreshing, check authentication status again to get user info
              await checkAuthentication();

              return axios(originalRequest); // Retry the original request
            } catch (refreshError) {
              console.error('Error refreshing token:', refreshError);
              // If refresh token fails, clear everything and redirect to login
              localStorage.removeItem('jwtToken');
              setIsAuthenticated(false);
              setUser(null);
              window.location.href = CLIENT_URL;
              return Promise.reject(refreshError); // Reject with the refresh error
            } finally {
              isRefreshing.current = false;
            }
          }
        }
        return Promise.reject(error); // For other errors or if refresh already in progress
      }
    );

    return () => {
      isMounted.current = false;
      axios.interceptors.response.eject(interceptor);
    };
  }, [CLIENT_URL, BACKEND_URL, checkAuthentication]);

  const login = () => {
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  const logout = async () => {
    try {
      await axios.get(`${BACKEND_URL}/auth/logout`);
    } catch (error) {
      console.error('Backend logout failed:', error);
    } finally {
      localStorage.removeItem('jwtToken');
      setIsAuthenticated(false);
      setUser(null);
      window.history.replaceState({}, document.title, CLIENT_URL);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
