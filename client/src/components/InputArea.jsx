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
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
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
        console.log('Speech recognition started...');
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setMessage((prevMessage) => (prevMessage ? prevMessage + ' ' + transcript : transcript));
        console.log('Partial result:', transcript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        console.log('Speech recognition ended. Final message:', message);
      };

      recognitionRef.current.onerror = (event) => {
        setIsRecording(false);
        console.error('Speech recognition error:', event.error);
      };
    } else {
      console.warn('Web Speech API not supported in this browser.');
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

    console.log('Sending requestBody:', requestBody);

    try {
      const storedToken = localStorage.getItem('jwtToken');
      if (!storedToken) {
        console.error('No JWT token found. User not authenticated.');
        setDisplayMessage('Authentication required. Please log in.');
        setMessageType('error');
        return;
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/calendar-request`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        }
      );

      setPendingSuggestion(null);
      setOverlappingEvents([]);

      if (response.data.success) {
        if (response.data.calendarLinks) {
          const linksHtml = response.data.calendarLinks.map((link, index) =>
            `<a key=${index} href="${link}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">Event Link ${index + 1}</a>`
          ).join('<br/>');
          setDisplayMessage(`Event(s) created! Check your Google Calendar.<br/>${response.data.calendarLinks.length > 1 ? 'Links' : 'Link'}: ${linksHtml}`);
          setMessageType('success');
        } else if (response.data.events) {
          setCalendarEvents(response.data.events);
          setDisplayMessage(response.data.feedback || `Found ${response.data.events.length} events.`);
          setMessageType('success');
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
          setDisplayMessage(response.data.feedback || `Failed to process request: Unknown error`);
          setMessageType('error');
          console.warn('Failed to process request:', response.data.feedback);
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.feedback || error.message;
      setDisplayMessage(`Error processing request: ${errorMessage}`);
      setMessageType('error');
      console.error('Error sending message to backend:', error);
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
  };

  return (
    <div className={`fixed z-50 transition-all duration-300 ease-in-out transform 
      ${isInputExpanded 
        ? 'bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg h-auto bg-card rounded-2xl shadow-xl p-4 border border-border' 
        : 'bottom-4 right-4 w-16 h-16'
      }
    `}>
      {/* Overlap Confirmation Pop-up */}
      {overlappingEvents.length > 0 && pendingSuggestion && (
        <div className="fixed inset-0 bg-background bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative border border-border transform transition-all scale-100 opacity-100 ease-out duration-300 max-h-[90vh] flex flex-col justify-between">
            <button
              onClick={handleCancelOverlap}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors duration-200 text-3xl font-bold leading-none focus:outline-none"
            >
              &times;
            </button>
            <div className="text-center mb-6 flex-shrink-0">
              <FaExclamationTriangle className="text-accent text-6xl mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Conflicting Event Detected!</h2>
              <p className="text-lg text-muted-foreground">It looks like you already have an event scheduled at this time.</p>
            </div>
            
            <div className="mb-6 p-4 bg-secondary rounded-xl border border-border flex-grow overflow-y-auto">
              <p className="font-semibold text-foreground text-base mb-2">Your proposed event:</p>
              <p className="text-sm text-muted-foreground mb-4"><strong>{pendingSuggestion.summary}</strong> at {new Date(pendingSuggestion.dateTime).toLocaleString()}</p>
              <p className="font-semibold text-foreground text-base mb-2">Conflicting with:</p>
              <ul className="list-disc list-inside text-left space-y-1">
                {overlappingEvents.map((event, index) => {
                  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString();
                  const endTime = new Date(event.end.dateTime || event.end.date).toLocaleString();
                  return (
                    <li key={index} className="text-muted-foreground text-sm">
                      <span className="font-medium">{event.summary}</span> ({startTime} - {endTime})
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="text-center text-foreground mb-6 text-lg font-medium flex-shrink-0">Do you want to create this event anyway?</p>

            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 flex-shrink-0">
              <button
                onClick={() => handleSendMessage({ overrideOverlap: true })}
                className="w-full sm:w-auto px-6 py-3 bg-accent text-primary-foreground font-bold rounded-xl shadow-md hover:bg-yellow-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
              >
                <FaPaperPlane className="inline-block mr-2" /> Create Anyway
              </button>
              <button
                onClick={handleCancelOverlap}
                className="w-full sm:w-auto px-6 py-3 bg-secondary text-foreground font-bold rounded-xl shadow-md hover:bg-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border focus:ring-opacity-75"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* General Message Display (Success/Error/Warning - when no overlap pop-up is active) */}
      {displayMessage && overlappingEvents.length === 0 && (
        <div
          className={`fixed bottom-28 left-1/2 -translate-x-1/2 p-4 rounded-xl shadow-lg w-full max-w-md text-center whitespace-pre-wrap transition-opacity duration-500 relative flex items-center justify-center space-x-3 z-50
            ${messageType === 'success' ? 'bg-green-100 text-green-800' : messageType === 'warning' ? 'bg-accent/20 text-accent-foreground' : 'bg-destructive text-destructive-foreground'}`}
        >
          {messageType === 'error' && <FaTimesCircle className="text-2xl text-destructive mr-2" />}
          {messageType === 'warning' && <FaExclamationTriangle className="text-2xl text-accent mr-2" />}
          {messageType === 'success' && <FaCheckCircle className="text-2xl text-green-700 mr-2" />}
          <span dangerouslySetInnerHTML={{ __html: displayMessage }} className="text-lg font-medium" />
          <button
            onClick={handleDismissMessage}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground focus:outline-none"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>
      )}
      {/* Calendar Events Display Pop-up */}
      {calendarEvents.length > 0 && (
        <div className="fixed inset-0 bg-background bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative border border-border transform transition-all scale-100 opacity-100 ease-out duration-300 max-h-[90vh] flex flex-col">
            <button
              onClick={() => { setDisplayMessage(null); setMessageType(null); setCalendarEvents([]); handleDismissMessage(); }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors duration-200 text-3xl font-bold leading-none focus:outline-none"
            >
              &times;
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-primary mb-2">Your Upcoming Events</h2>
              <p className="text-lg text-muted-foreground">Here's what's on your calendar:</p>
            </div>
            
            <div className="mb-6 p-4 bg-secondary rounded-xl border border-border flex-grow overflow-y-auto">
              <ul className="list-none text-left space-y-4">
                {calendarEvents.map((event, index) => {
                  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString();
                  const endTime = new Date(event.end.dateTime || event.end.date).toLocaleString();
                  return (
                    <li key={index} className="pb-2 border-b border-border last:border-b-0">
                      <p className="font-semibold text-foreground text-base mb-1">{event.summary}</p>
                      <p className="text-sm text-muted-foreground">{startTime} - {endTime}</p>
                      {event.description && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleDismissMessage}
                className="w-full sm:w-auto px-6 py-3 bg-secondary text-foreground font-bold rounded-xl shadow-md hover:bg-muted-foreground transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border focus:ring-opacity-75"
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
            transition-all duration-300 ease-in-out transform hover:scale-110 
            ${isSpeechRecognitionSupported ? '' : 'bg-muted-foreground cursor-not-allowed'}
          `}
          disabled={!isSpeechRecognitionSupported}
        >
          {isSpeechRecognitionSupported ? (
            <FaMicrophone className="text-2xl" />
          ) : (
            <div className="relative group">
              <FaMicrophone className="text-2xl" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-sm text-primary-foreground bg-foreground rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                Voice input not supported in this browser
              </span>
            </div>
          )}
        </button>
      )}

      {isInputExpanded && (
        <div className="relative w-full flex items-center bg-card rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary border border-border">
          <textarea
            className="w-full p-3 pr-32 bg-transparent rounded-lg resize-none outline-none text-foreground placeholder-muted-foreground box-border"
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
                className="p-2 text-primary hover:text-blue-800 transition-colors duration-200 focus:outline-none"
              >
                <FaPaperPlane className="text-xl" />
              </button>
            )}
            {isSpeechRecognitionSupported ? (
              <button
                onClick={toggleRecording}
                className={`p-2 ${isRecording ? 'text-destructive hover:text-red-700' : 'text-muted-foreground hover:text-primary'} transition-colors duration-200 focus:outline-none`}
              >
                {isRecording ? <FaStopCircle className="text-xl" /> : <FaMicrophone className="text-xl" />}
              </button>
            ) : (
              <div className="relative group">
                <button
                  className="p-2 text-muted-foreground cursor-not-allowed"
                  disabled
                >
                  <FaMicrophone className="text-xl" />
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-sm text-primary-foreground bg-foreground rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  Voice input not supported in this browser
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleCollapseInput}
            className="absolute top-1/2 -translate-y-1/2 right-2 p-1 text-muted-foreground hover:text-foreground focus:outline-none"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>
      )}
    </div>
  );
};

export default InputArea;
