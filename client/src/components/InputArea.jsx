import React, { useState, useRef, useEffect, useContext } from 'react';
import { FaMicrophone, FaPaperPlane, FaStopCircle, FaExclamationTriangle, FaTimesCircle, FaTimes, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const InputArea = () => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  const recognitionRef = useRef(null);
  const { user } = useContext(AuthContext);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://calendar-maker-y0xc.onrender.com';

  const [displayMessage, setDisplayMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [overlappingEvents, setOverlappingEvents] = useState([]);
  const [pendingSuggestion, setPendingSuggestion] = useState(null);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(true);

  // 🔹 Setup Axios interceptor once
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('No refresh token');

            const res = await axios.post(`${BACKEND_URL}/auth/refresh`, { refreshToken });

            const newAccessToken = res.data.accessToken;
            localStorage.setItem('jwtToken', newAccessToken);

            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('refreshToken');
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [BACKEND_URL]);

  // 🔹 Speech recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsRecording(true);
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results).map((r) => r[0].transcript).join('');
        setMessage((prev) => (prev ? prev + ' ' + transcript : transcript));
      };
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
    } else {
      setIsSpeechRecognitionSupported(false);
    }

    return () => recognitionRef.current?.stop();
  }, []);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (isRecording && recognitionRef.current) recognitionRef.current.stop();
  };

  const handleSendMessage = async (options = {}) => {
    if (!message.trim() && !pendingSuggestion) return;

    let requestBody;
    if (pendingSuggestion && options.overrideOverlap) {
      requestBody = { ...pendingSuggestion, overrideOverlap: true };
      setMessage('');
    } else if (message.trim()) {
      requestBody = { text: message.trim() };
      setMessage('');
    } else return;

    try {
      const storedToken = localStorage.getItem('jwtToken');
      if (!storedToken) {
        setDisplayMessage('Authentication required. Please log in.');
        setMessageType('error');
        return;
      }

      const response = await axios.post(`${BACKEND_URL}/api/calendar-request`, requestBody, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      setPendingSuggestion(null);
      setOverlappingEvents([]);

      if (response.data.success) {
        if (response.data.calendarLinks) {
          const linksHtml = response.data.calendarLinks
            .map((link, i) => `<a key=${i} href="${link}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">Event Link ${i + 1}</a>`)
            .join('<br/>');
          setDisplayMessage(`Event(s) created!<br/>${linksHtml}`);
          setMessageType('success');
        } else if (response.data.events) {
          setCalendarEvents(response.data.events);
          setDisplayMessage(null); // show modal instead of banner
          setMessageType(null);
        } else {
          setDisplayMessage(response.data.feedback || 'Request processed successfully.');
          setMessageType('success');
        }
      } else if (response.data.action === 'confirm_create') {
        setDisplayMessage(response.data.feedback);
        setMessageType('warning');
        setOverlappingEvents(response.data.overlappingEvents || []);
        setPendingSuggestion(response.data.suggestion);
      } else {
        setDisplayMessage(response.data.feedback || 'Failed to process request');
        setMessageType('error');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.feedback || err.message;
      setDisplayMessage(`Error: ${errorMessage}`);
      setMessageType('error');
    }
  };

  const toggleRecording = () => {
    if (isRecording) recognitionRef.current.stop();
    else {
      setMessage('');
      recognitionRef.current.start();
    }
  };

  const handleCancelOverlap = () => {
    setDisplayMessage(null);
    setMessageType(null);
    setOverlappingEvents([]);
    setPendingSuggestion(null);
    setMessage('');
  };

  const handleDismissMessage = () => {
    setDisplayMessage(null);
    setMessageType(null);
    setCalendarEvents([]);
    setOverlappingEvents([]);
    setPendingSuggestion(null);
  };

  const handleExpandInput = () => setIsInputExpanded(true);

  const handleCollapseInput = () => {
    setIsInputExpanded(false);
    setIsRecording(false);
    recognitionRef.current?.stop();
    setMessage('');
    setDisplayMessage(null);
    setMessageType(null);
    setCalendarEvents([]);
    setOverlappingEvents([]);
    setPendingSuggestion(null);
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-in-out transform ${
        isInputExpanded
          ? 'bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg h-auto bg-card rounded-2xl shadow-xl p-4 border border-border'
          : 'bottom-4 right-4 w-16 h-16'
      }`}
    >
      {/* Overlap Confirmation Modal */}
      {overlappingEvents.length > 0 && pendingSuggestion && (
        <div className="fixed inset-0 bg-background bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative border border-border flex flex-col max-h-[90vh]">
            <button onClick={handleCancelOverlap} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-3xl">&times;</button>
            <div className="text-center mb-6">
              <FaExclamationTriangle className="text-accent text-6xl mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Conflicting Event Detected!</h2>
              <p className="text-muted-foreground">It looks like you already have an event scheduled at this time.</p>
            </div>
            <div className="mb-6 p-4 bg-secondary rounded-xl border flex-grow overflow-y-auto">
              <p className="font-semibold mb-2">Your proposed event:</p>
              <p className="text-sm mb-4"><strong>{pendingSuggestion.summary}</strong> at {new Date(pendingSuggestion.dateTime).toLocaleString()}</p>
              <p className="font-semibold mb-2">Conflicting with:</p>
              <ul className="list-disc list-inside space-y-1">
                {overlappingEvents.map((event, i) => {
                  const start = new Date(event.start.dateTime || event.start.date).toLocaleString();
                  const end = new Date(event.end.dateTime || event.end.date).toLocaleString();
                  return (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{event.summary}</span> ({start} - {end})
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="text-center mb-6">Do you want to create this event anyway?</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={() => handleSendMessage({ overrideOverlap: true })} className="px-6 py-3 bg-accent text-primary-foreground font-bold rounded-xl">
                <FaPaperPlane className="inline mr-2" /> Create Anyway
              </button>
              <button onClick={handleCancelOverlap} className="px-6 py-3 bg-secondary font-bold rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* General Message Banner */}
      {displayMessage && overlappingEvents.length === 0 && !calendarEvents.length && (
        <div className="absolute -top-16 left-0 right-0 flex justify-center z-50">
          <div
            className={`px-4 py-2 rounded-lg shadow-lg flex items-center justify-between w-full max-w-md ${
              messageType === 'success'
                ? 'bg-green-100 text-green-800'
                : messageType === 'warning'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-500 text-white'
            }`}
          >
            <span dangerouslySetInnerHTML={{ __html: displayMessage }} />
            <button onClick={handleDismissMessage} className="ml-2"><FaTimes /></button>
          </div>
        </div>
      )}

      {/* Calendar Events Modal */}
      {calendarEvents.length > 0 && (
        <div className="fixed inset-0 bg-background bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative border flex flex-col max-h-[90vh]">
            <button onClick={handleDismissMessage} className="absolute top-4 right-4 text-3xl">&times;</button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Your Upcoming Events</h2>
              <p className="text-muted-foreground">Here's what's on your calendar:</p>
            </div>
            <div className="mb-6 p-4 bg-secondary rounded-xl border flex-grow overflow-y-auto">
              <ul className="space-y-4">
                {calendarEvents.map((event, i) => {
                  const start = new Date(event.start.dateTime || event.start.date).toLocaleString();
                  const end = new Date(event.end.dateTime || event.end.date).toLocaleString();
                  return (
                    <li key={i} className="pb-2 border-b last:border-0">
                      <p className="font-semibold">{event.summary}</p>
                      <p className="text-sm text-muted-foreground">{start} - {end}</p>
                      {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex justify-center">
              <button onClick={handleDismissMessage} className="px-6 py-3 bg-secondary font-bold rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed Input Button */}
      {!isInputExpanded && (
        <button
          onClick={handleExpandInput}
          className={`p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform ${
            isSpeechRecognitionSupported ? '' : 'bg-muted-foreground cursor-not-allowed'
          }`}
          disabled={!isSpeechRecognitionSupported}
        >
          <FaMicrophone className="text-2xl" />
        </button>
      )}

      {/* Expanded Input Area */}
      {isInputExpanded && (
        <div className="relative w-full flex items-center bg-card rounded-2xl shadow-sm border">
          <textarea
            className="w-full p-3 pr-32 bg-transparent rounded-lg resize-none outline-none"
            placeholder="Type your event or speak..."
            rows="1"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            value={message}
            onChange={handleInputChange}
          ></textarea>
          <div className="absolute right-12 flex items-center space-x-2">
            {message && (
              <button onClick={() => handleSendMessage()} className="p-2 text-primary">
                <FaPaperPlane className="text-xl" />
              </button>
            )}
            {isSpeechRecognitionSupported && (
              <button onClick={toggleRecording} className={`p-2 ${isRecording ? 'text-destructive' : 'text-muted-foreground hover:text-primary'}`}>
                {isRecording ? <FaStopCircle className="text-xl" /> : <FaMicrophone className="text-xl" />}
              </button>
            )}
          </div>
          <button onClick={handleCollapseInput} className="absolute top-1/2 -translate-y-1/2 right-2 p-1">
            <FaTimes className="text-xl" />
          </button>
        </div>
      )}
    </div>
  );
};

export default InputArea;
