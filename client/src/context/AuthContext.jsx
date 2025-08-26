import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Default to false
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true); // To prevent state updates on unmounted component
  const isRefreshing = useRef(false); // To prevent multiple refresh token requests

  const CLIENT_URL = import.meta.env.VITE_CLIENT_URL || 'http://localhost:5173'; // From env or config
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'; // From env or config

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
          return response.data.user; // Return user object on success
        } else {
          // Token invalid or expired, but not handled by interceptor yet (initial load)
          console.log("Access token invalid on initial check, attempting refresh via interceptor...");
          return null;
        }
      } catch (error) {
        // If the error is a 401, re-throw it so the interceptor can catch it.
        if (error.response && error.response.status === 401) {
            console.warn("checkAuthentication: 401 received, re-throwing for interceptor to handle.");
            throw error;
        }
        // For other errors, treat as unauthenticated
        console.error('checkAuthentication: Error checking auth status (non-401):', error);
        localStorage.removeItem('jwtToken');
        setIsAuthenticated(false);
        setUser(null);
        return null;
      }
    }
    setIsAuthenticated(false);
    setUser(null);
    return null;
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
        const userDetails = await checkAuthentication(); // Check if new token is valid and get user data
        if (userDetails) {
          setIsAuthenticated(true);
          setUser(userDetails);
          authenticatedByUrl = true;
        } else {
          // Even if token was in URL, if it's not valid, treat as unauthenticated
          localStorage.removeItem('jwtToken');
          setIsAuthenticated(false);
          setUser(null);
        }
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
        try {
          // This will now wait for checkAuthentication to complete fully, including potential refresh
          await checkAuthentication();
        } catch (error) {
          // If checkAuthentication re-throws a 401, the interceptor will handle it.
          // We don't need to do anything specific here for 401s, just prevent the uncaught promise.
          console.log("initializeAuth: Caught error from checkAuthentication, likely 401 for interceptor.", error);
        }
      }
      setLoading(false);
    };

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const storedToken = localStorage.getItem('jwtToken'); // Get token from local storage inside interceptor

        // If error is 401 (Unauthorized) and it's not a retry after refresh and not the refresh token request itself
        if (error.response && error.response.status === 401 && !originalRequest._retry && originalRequest.url !== `${BACKEND_URL}/auth/refresh-token`) {
          console.log("Interceptor: Caught 401 error, attempting token refresh.");
          originalRequest._retry = true;
          
          if (!isRefreshing.current) {
            isRefreshing.current = true;
            try {
              console.log("Interceptor: Initiating refresh token request...");
              const response = await axios.post(`${BACKEND_URL}/auth/refresh-token`, {}, { withCredentials: true });
              const newAccessToken = response.data.accessToken;
              console.log("Interceptor: New access token received.");

              localStorage.setItem('jwtToken', newAccessToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
              originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
              console.log("Interceptor: Stored new access token and updated headers.");
              
              await checkAuthentication();
              console.log("Interceptor: Re-authenticated after token refresh.");

              return axios(originalRequest); // Retry the original request
            } catch (refreshError) {
              console.error('Interceptor: Error refreshing token:', refreshError);
              localStorage.removeItem('jwtToken');
              setIsAuthenticated(false);
              setUser(null);
              window.location.href = CLIENT_URL;
              return Promise.reject(refreshError);
            } finally {
              isRefreshing.current = false;
            }
          }
          console.log("Interceptor: Refresh already in progress, rejecting original request.");
          return Promise.reject(error);
        }

        if (error.response && error.response.status === 401 && originalRequest.url === `${BACKEND_URL}/auth/refresh-token`) {
            console.error("Interceptor: Refresh token itself is invalid or expired, logging out.");
            localStorage.removeItem('jwtToken');
            setIsAuthenticated(false);
            setUser(null);
            window.location.href = CLIENT_URL;
            return Promise.reject(error);
        }
        console.log("Interceptor: Other error caught or refresh not applicable.", error.response?.status);
        return Promise.reject(error);
      }
    );

    initializeAuth(); // Call initializeAuth AFTER the interceptor is set up

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
