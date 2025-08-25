import React, { useState, useRef, useEffect, useContext } from 'react';
import { FaMicrophone, FaPaperPlane, FaStopCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa'; // Added FaTimesCircle for error
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const InputArea = () => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const { user } = useContext(AuthContext);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'; // From env or config
  const [displayMessage, setDisplayMessage] = useState(null); // State for AI response/feedback
  const [messageType, setMessageType] = useState(null); // 'success', 'error', or 'warning'
  const [calendarEvents, setCalendarEvents] = useState([]); // State for displaying a list of events
  const [overlappingEvents, setOverlappingEvents] = useState([]); // New state for overlapping events
  const [pendingSuggestion, setPendingSuggestion] = useState(null); // To store suggestion during overlap confirmation

  // Removed useEffect to clear message after 5 seconds for persistent display.

  useEffect(() => {
    // Existing Speech Recognition setup
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
      requestBody = { ...pendingSuggestion, overrideOverlap: true }; // Flatten pendingSuggestion directly into requestBody
      setMessage(''); // Clear current message input if overriding
    } else if (message.trim()) {
      requestBody = { text: message.trim() };
      setMessage(''); // Clear after sending initial text
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

      // Clear pending suggestion and overlapping events after a response
      setPendingSuggestion(null);
      setOverlappingEvents([]);

      if (response.data.success) {
        if (response.data.calendarLinks) {
          const linksHtml = response.data.calendarLinks.map((link, index) =>
            `<a key=${index} href="${link}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${link}</a>`
          ).join('<br/>');
          setDisplayMessage(`Event(s) created! Check your Google Calendar.<br/>Links: ${linksHtml}`);
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
        // Handle overlap confirmation request from backend
        if (response.data.action === "confirm_create") {
          setDisplayMessage(response.data.feedback);
          setMessageType('warning'); // Use a warning type for overlap message
          setOverlappingEvents(response.data.overlappingEvents || []);
          setPendingSuggestion(response.data.suggestion); // Store the full AI suggestion for re-submission
        } else {
          // General failure / AI non-calendar related feedback
          setDisplayMessage(response.data.feedback || `Failed to process request: Unknown error`);
          setMessageType('error');
          console.warn('Failed to process request:', response.data.feedback);
        }
      }
    } catch (error) {
      // Network or unhandled error
      const errorMessage = error.response?.data?.feedback || error.message;
      setDisplayMessage(`Error processing request: ${errorMessage}`);
      setMessageType('error');
      console.error('Error sending message to backend:', error);
    }
    // Note: setMessage('') is now handled inside success/override blocks where appropriate
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
    setMessage(''); // Clear the input field as well
  };

  const handleDismissMessage = () => {
    setDisplayMessage(null);
    setMessageType(null);
    setCalendarEvents([]);
    setOverlappingEvents([]); // Clear any remaining overlap data
    setPendingSuggestion(null); // Clear any remaining pending suggestion
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex flex-col items-center justify-center z-10">
      {/* Overlap Confirmation Pop-up */}
      {overlappingEvents.length > 0 && pendingSuggestion && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative transform transition-all scale-100 opacity-100 ease-out duration-300">
            <button
              onClick={handleCancelOverlap}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 text-2xl font-bold leading-none focus:outline-none"
            >
              &times;
            </button>
            <div className="text-center mb-6">
              <FaExclamationTriangle className="text-yellow-500 text-6xl mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Conflicting Event Detected!</h2>
              <p className="text-lg text-gray-700">It looks like you already have an event scheduled at this time.</p>
            </div>
            
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-semibold text-yellow-800 text-base mb-2">Your proposed event:</p>
              <p className="text-sm text-yellow-700 mb-2"><strong>{pendingSuggestion.summary}</strong> at {new Date(pendingSuggestion.dateTime).toLocaleString()}</p>
              <p className="font-semibold text-yellow-800 text-base mb-2">Conflicting with:</p>
              <ul className="list-disc list-inside text-left space-y-1">
                {overlappingEvents.map((event, index) => {
                  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString();
                  const endTime = new Date(event.end.dateTime || event.end.date).toLocaleString();
                  return (
                    <li key={index} className="text-gray-700 text-sm">
                      <span className="font-medium">{event.summary}</span> ({startTime} - {endTime})
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="text-center text-gray-800 mb-6 text-lg font-medium">Do you want to create this event anyway?</p>

            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => handleSendMessage({ overrideOverlap: true })}
                className="w-full sm:w-auto px-6 py-3 bg-yellow-500 text-white font-bold rounded-lg shadow-md hover:bg-yellow-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75"
              >
                <FaPaperPlane className="inline-block mr-2" /> Create Anyway
              </button>
              <button
                onClick={handleCancelOverlap}
                className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg shadow-md hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
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
          className={`mb-4 p-4 rounded-lg shadow-lg w-full max-w-3xl text-center whitespace-pre-wrap transition-opacity duration-500 relative flex items-center justify-center space-x-3
            ${messageType === 'success' ? 'bg-green-100 text-green-800' : messageType === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
        >
          {messageType === 'error' && <FaTimesCircle className="text-2xl text-red-700" />}
          <span dangerouslySetInnerHTML={{ __html: displayMessage }} className="text-lg font-medium" />
          <button
            onClick={handleDismissMessage} // Use new dismiss handler
            className="absolute top-1 right-1 p-1 text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            &times;
          </button>
        </div>
      )}
      {/* Calendar Events Display Pop-up */}
      {calendarEvents.length > 0 && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative transform transition-all scale-100 opacity-100 ease-out duration-300 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setDisplayMessage(null); setMessageType(null); setCalendarEvents([]); handleDismissMessage(); }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 text-2xl font-bold leading-none focus:outline-none"
            >
              &times;
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Your Upcoming Events</h2>
              <p className="text-lg text-gray-700">Here's what's on your calendar:</p>
            </div>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <ul className="list-none text-left space-y-4">
                {calendarEvents.map((event, index) => {
                  const startTime = new Date(event.start.dateTime || event.start.date).toLocaleString();
                  const endTime = new Date(event.end.dateTime || event.end.date).toLocaleString();
                  return (
                    <li key={index} className="pb-2 border-b border-blue-200 last:border-b-0">
                      <p className="font-semibold text-blue-800 text-base mb-1">{event.summary}</p>
                      <p className="text-sm text-blue-700">{startTime} - {endTime}</p>
                      {event.description && <p className="text-xs text-blue-600 mt-1">{event.description}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleDismissMessage}
                className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-lg shadow-md hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Input Area */}
      <div className="relative w-full max-w-md flex items-center bg-gray-100 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
        <textarea
          className="w-full p-3 pr-24 bg-transparent rounded-lg resize-none outline-none text-gray-800 placeholder-gray-500 box-border"
          placeholder="Type your event or speak..."
          rows="1"
          style={{ minHeight: '48px', maxHeight: '120px' }}
          value={message}
          onChange={handleInputChange}
        ></textarea>
        <div className="absolute right-3 flex items-center space-x-2">
          {message && (
            <button
              onClick={handleSendMessage}
              className="p-2 text-blue-600 hover:text-blue-800 transition-colors duration-200 focus:outline-none"
            >
              <FaPaperPlane className="text-xl" />
            </button>
          )}
          <button
            onClick={toggleRecording}
            className={`p-2 ${isRecording ? 'text-red-500 hover:text-red-700' : 'text-gray-600 hover:text-blue-500'} transition-colors duration-200 focus:outline-none`}
          >
            {isRecording ? <FaStopCircle className="text-xl" /> : <FaMicrophone className="text-xl" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputArea;
