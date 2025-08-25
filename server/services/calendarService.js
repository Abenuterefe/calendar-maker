const { google } = require('googleapis');

const calendarService = {
  createCalendarEvent: async (oauth2Client, userId, eventDetails, overrideOverlap = false) => {
    // The oauth2Client should already have credentials set for the specific user
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const start = new Date(eventDetails.dateTime);
    const end = new Date(start.getTime() + (eventDetails.durationMinutes || 60) * 60000);

    // Check for overlaps unless overrideOverlap is true
    if (!overrideOverlap) {
      const existingEvents = await calendarService.getEventsInTimeRange(
        oauth2Client,
        userId,
        start.toISOString(),
        end.toISOString()
      );

      const overlappingEvents = existingEvents.filter(existingEvent => {
        const existingStart = new Date(existingEvent.start.dateTime || existingEvent.start.date);
        const existingEnd = new Date(existingEvent.end.dateTime || existingEvent.end.date);

        // Check for actual overlap logic
        return (start < existingEnd && end > existingStart);
      });

      if (overlappingEvents.length > 0) {
        return { action: "confirm_create", feedback: "You have an overlapping event. Do you want to create this event anyway?", overlappingEvents, suggestion: eventDetails };
      }
    }

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: { dateTime: start.toISOString(), timeZone: "Africa/Addis_Ababa" }, // TODO: Make timezone configurable or user-specific
      end: { dateTime: end.toISOString(), timeZone: "Africa/Addis_Ababa" }, // TODO: Make timezone configurable or user-specific
    };

    console.log("🔨 Sending event to Google Calendar API for user", userId, ":", event);

    const response = await calendar.events.insert({
      calendarId: "primary", // Or a specific calendar ID if provided by the user
      requestBody: event,
    });

    return { data: response.data, feedback: "Event created successfully!" };
  },

  createCalendarMeeting: async (oauth2Client, userId, eventDetails, overrideOverlap = false) => {
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const start = new Date(eventDetails.dateTime);
    const end = new Date(start.getTime() + (eventDetails.durationMinutes || 60) * 60000);

    // Check for overlaps unless overrideOverlap is true
    if (!overrideOverlap) {
      const existingEvents = await calendarService.getEventsInTimeRange(
        oauth2Client,
        userId,
        start.toISOString(),
        end.toISOString()
      );

      const overlappingEvents = existingEvents.filter(existingEvent => {
        const existingStart = new Date(existingEvent.start.dateTime || existingEvent.start.date);
        const existingEnd = new Date(existingEvent.end.dateTime || existingEvent.end.date);
        return (start < existingEnd && end > existingStart);
      });

      if (overlappingEvents.length > 0) {
        return { action: "confirm_create", feedback: "You have an overlapping meeting. Do you want to create this meeting anyway?", overlappingEvents, suggestion: eventDetails };
      }
    }

    const attendees = eventDetails.attendees.map(email => ({ email }));

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: { dateTime: start.toISOString(), timeZone: "Africa/Addis_Ababa" }, // TODO: Make timezone configurable or user-specific
      end: { dateTime: end.toISOString(), timeZone: "Africa/Addis_Ababa" }, // TODO: Make timezone configurable or user-specific
      attendees: attendees,
      conferenceData: { // Request a Google Meet link
        createRequest: {
          requestId: `${Date.now()}-meet`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: true,
      },
    };

    console.log("🤝 Scheduling meeting with Google Calendar API for user", userId, ":", event);

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1, // Required to create conference data
      sendNotifications: true, // Send invitations to attendees
    });

    return { data: response.data, feedback: "Meeting created successfully!" };
  },

  getEventsInTimeRange: async (oauth2Client, userId, timeMin, timeMax) => {
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    console.log("🔎 Checking for overlapping events for user", userId, "between", timeMin, "and", timeMax);

    try {
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date(timeMin).toISOString(),
        timeMax: new Date(timeMax).toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      console.log("✅ Overlapping events check response:", response.data.items.length, "events found.");
      return response.data.items || [];
    } catch (error) {
      console.error("❌ Error checking for overlapping events:", error.message, error.stack);
      throw new Error("Failed to check for overlapping events.");
    }
  },

  getCalendarEvents: async (oauth2Client, userId, startDate, endDate) => {
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    console.log("🔎 Fetching events from Google Calendar API for user", userId, "from", startDate, "to", endDate);

    try {
      const minDateTime = new Date(startDate);
      let maxDateTime = new Date(endDate);

      // If startDate and endDate are the same, adjust maxDateTime to the end of the day
      if (minDateTime.toDateString() === maxDateTime.toDateString()) {
        maxDateTime.setHours(23, 59, 59, 999);
      }

      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: minDateTime.toISOString(),
        timeMax: maxDateTime.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      console.log("✅ Google Calendar API response for events list:", response.data);
      return response.data.items;
    } catch (error) {
      console.error("❌ Error fetching calendar events:", error.message, error.stack);
      throw new Error("Failed to fetch calendar events from Google API.");
    }
  },
};

module.exports = calendarService;

