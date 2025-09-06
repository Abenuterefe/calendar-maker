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

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setMessage((prevMessage) => (prevMessage ? prevMessage + ' ' + transcript : transcript));
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };
    } else {
      setIsSpeechRecognitionSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [message]);

  const handleInputChange = (event) => {
    setMessage(event.target.value);
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
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
    } else {
      return;
    }

    try {
      const storedToken = localStorage.getItem('jwtToken');
      if (!storedToken) {
        setDisplayMessage('Authentication required. Please log in.');
        setMessageType('error');
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/calendar-request`,
        requestBody,
        { headers: { Authorization: `Bearer ${storedToken}` } }
      );

      setPendingSuggestion(null);
      setOverlappingEvents([]);

      if (response.data.success) {
        if (response.data.calendarLinks) {
          const linksHtml = response.data.calendarLinks.map((link, index) =>
            `<a key=${index} href="${link}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">Event Link ${index + 1}</a>`
          ).join('<br/>');
          setDisplayMessage(`Event(s) created!<br/>${linksHtml}`);
          setMessageType('success');
        } else if (response.data.events) {
          // ✅ show full event modal instead of just message
          setCalendarEvents(response.data.events);
          setDisplayMessage(null);
          setMessageType(null);
        } else {
          setDisplayMessage(response.data.feedback || "Request processed successfully.");
          setMessageType('success');
        }
      } else {
        if (response.data.action === "confirm_create") {
          setDisplayMessage(response.data.feedback);
          setMessageType('warning');
          setOverlappingEvents(response.data.overlappingEvents || []);
          setPendingSuggestion(response.data.suggestion);
        } else {
          setDisplayMessage(response.data.feedback || `Failed to process request`);
          setMessageType('error');
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.feedback || error.message;
      setDisplayMessage(`Error: ${errorMessage}`);
      setMessageType('error');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
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

  const handleExpandInput = () => {
    setIsInputExpanded(true);
  };

  const handleCollapseInput = () => {
    setIsInputExpanded(false);
    setIsRecording(false);
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setMessage('');
    setDisplayMessage(null); 
    setMessageType(null);
  };

  return (
    <div className={`fixed z-50 transition-all duration-300 ease-in-out transform 
      ${isInputExpanded 
        ? 'bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg h-auto bg-card rounded-2xl shadow-xl p-4 border border-border' 
        : 'bottom-4 right-4 w-16 h-16'
      }
    `}>
      {/* Floating Error/Success/Warning Message */}
      {displayMessage && overlappingEvents.length === 0 && (
        <div className="absolute -top-14 left-0 right-0 flex justify-center z-50">
          <div
            className={`px-4 py-2 rounded-lg shadow-lg flex items-center justify-between w-full max-w-md
              ${messageType === 'success' ? 'bg-green-100 text-green-800' : 
                messageType === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-red-500 text-white'}`}
          >
            <span dangerouslySetInnerHTML={{ __html: displayMessage }} />
            <button onClick={handleDismissMessage} className="ml-2">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Calendar Events Modal */}
      {calendarEvents.length > 0 && (
        <div className="fixed inset-0 bg-background bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative border border-border">
            <button
              onClick={() => { setCalendarEvents([]); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors text-2xl"
            >
              &times;
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-primary mb-2">Your Upcoming Events</h2>
            </div>
            <div className="mb-6 p-4 bg-secondary rounded-xl border border-border max-h-[60vh] overflow-y-auto">
              <ul className="list-none text-left space-y-4">
                {calendarEvents.map((event, index) => {
                  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString();
                  const endTime = new Date(event.end.dateTime || event.end.date).toLocaleString();
                  return (
                    <li key={index} className="pb-2 border-b border-border last:border-b-0">
                      <p className="font-semibold text-foreground">{event.summary}</p>
                      <p className="text-sm text-muted-foreground">{startTime} - {endTime}</p>
                      {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => setCalendarEvents([])}
                className="px-6 py-2 bg-secondary text-foreground rounded-lg hover:bg-muted-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed/Expanded Input Area */}
      {!isInputExpanded && (
        <button
          onClick={handleExpandInput}
          className={`p-4 rounded-full bg-primary text-primary-foreground shadow-lg 
            transition-all duration-300 transform hover:scale-110 
            ${isSpeechRecognitionSupported ? '' : 'bg-muted-foreground cursor-not-allowed'}
          `}
          disabled={!isSpeechRecognitionSupported}
        >
          <FaMicrophone className="text-2xl" />
        </button>
      )}

      {isInputExpanded && (
        <div className="relative w-full flex items-center bg-card rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary border border-border">
          <textarea
            className="w-full p-3 pr-32 bg-transparent rounded-lg resize-none outline-none text-foreground placeholder-muted-foreground"
            placeholder="Type your event or speak..."
            rows="1"
            style={{ minHeight: '48px', maxHeight: '120px' }}
            value={message}
            onChange={handleInputChange}
          ></textarea>
          <div className="absolute right-12 flex items-center space-x-2">
            {message && (
              <button
                onClick={() => handleSendMessage()}
                className="p-2 text-primary hover:text-blue-800 transition-colors"
              >
                <FaPaperPlane className="text-xl" />
              </button>
            )}
            {isSpeechRecognitionSupported && (
              <button
                onClick={toggleRecording}
                className={`p-2 ${isRecording ? 'text-destructive hover:text-red-700' : 'text-muted-foreground hover:text-primary'} transition-colors`}
              >
                {isRecording ? <FaStopCircle className="text-xl" /> : <FaMicrophone className="text-xl" />}
              </button>
            )}
          </div>
          <button
            onClick={handleCollapseInput}
            className="absolute top-1/2 -translate-y-1/2 right-2 p-1 text-muted-foreground hover:text-foreground"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>
      )}
    </div>
  );
};

export default InputArea;
