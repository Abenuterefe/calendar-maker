const aiService = require('../services/aiService');
const calendarService = require('../services/calendarService');
const googleOAuthClient = require('../config/googleOAuth');
const userRepository = require('../repositories/userRepository');

const calendarController = {
  handleCalendarRequest: async (req, res) => {
    console.log("➡️ /calendar-request endpoint hit");

    // req.user should be populated by JWT middleware if this route is protected
    if (!req.user || !req.user.id) {
      console.warn("⚠️ User not authenticated for /calendar-request");
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const userInDb = await userRepository.findById(req.user.id);
      if (!userInDb || !userInDb.accessToken) {
        console.warn("⚠️ User tokens not found in DB for user ID:", req.user.id);
        return res.status(401).json({ error: "Google tokens not available for user" });
      }

      // Set user-specific credentials for the OAuth client
      googleOAuthClient.setCredentials({
        access_token: userInDb.accessToken,
        refresh_token: userInDb.refreshToken,
        expiry_date: userInDb.tokenExpiryDate ? userInDb.tokenExpiryDate.getTime() : null,
      });

      let suggestion;
      const overrideOverlap = req.body.overrideOverlap || false;

      console.log("Controller - Received overrideOverlap:", overrideOverlap);
      console.log("Controller - Full Request Body:", req.body); // Log full body for debugging

      if (overrideOverlap) { // Check only for overrideOverlap flag
        console.log("Controller - Taking OVERRIDE path.");
        // When overrideOverlap is true, the frontend sends the flattened pendingSuggestion in req.body
        // So, req.body itself contains the event details.
        suggestion = { ...req.body };
        delete suggestion.overrideOverlap; // Remove the flag from the suggestion object itself
        suggestion.status = true; // Ensure status is true when overriding
      } else {
        console.log("Controller - Taking NORMAL AI PROCESSING path.");
        const userText = req.body.text;
        console.log("🎙️ User said:", userText);
        if (!userText) {
          return res.status(400).json({ success: false, feedback: "No text provided for AI processing." });
        }
        try {
          suggestion = await aiService.getAIEventSuggestion(userText);
          console.log("🤖 AI suggestion:", suggestion);
        } catch (err) {
          console.warn("⚠️ AI failed:", err.message);
          return res.status(400).json({ success: false, feedback: `AI failed to understand your request: ${err.message}` });
        }
      }

      if (!suggestion.status) {
        console.log("❌ AI returned status false:", suggestion.feedback);
        return res.json({ success: false, feedback: suggestion.feedback });
      }

      if (suggestion.action === "read") {
        // Handle read action
        if (!suggestion.startDate || !suggestion.endDate) {
          return res.status(400).json({ success: false, feedback: "Missing startDate or endDate for read request." });
        }
        const events = await calendarService.getCalendarEvents(
          googleOAuthClient,
          req.user.id,
          suggestion.startDate,
          suggestion.endDate
        );
        return res.json({ success: true, events: events, feedback: `Found ${events.length} events.` });
      } else {
        // Handle create action
        const recurrenceCount = suggestion.recurrenceCount || 1; // Default to 1 if not specified
        const calendarLinks = [];

        // Create a temporary event details object for overlap check, preserving original suggestion
        const tempEventDetails = { ...suggestion };

        // Handle the first event creation attempt (with or without override)
        let initialCreationResult;
        if (tempEventDetails.attendees && tempEventDetails.attendees.length > 0) {
          console.log("Controller - Calling createCalendarMeeting for initial event with overrideOverlap:", overrideOverlap);
          initialCreationResult = await calendarService.createCalendarMeeting(
            googleOAuthClient,
            req.user.id,
            tempEventDetails,
            overrideOverlap
          );
        } else {
          console.log("Controller - Calling createCalendarEvent for initial event with overrideOverlap:", overrideOverlap);
          initialCreationResult = await calendarService.createCalendarEvent(
            googleOAuthClient,
            req.user.id,
            tempEventDetails,
            overrideOverlap
          );
        }

        if (initialCreationResult.action === "confirm_create") {
          console.log("⚠️ Overlapping events found (from service) for initial event.");
          return res.json({ success: false, ...initialCreationResult });
        } else if (initialCreationResult.data) {
          calendarLinks.push(initialCreationResult.data.htmlLink);

          // Handle recurrence for remaining days if recurrenceCount > 1
          for (let i = 1; i < recurrenceCount; i++) {
            const eventDateTime = new Date(suggestion.dateTime);
            eventDateTime.setDate(eventDateTime.getDate() + i); // Increment day for recurring events

            const recurringEventDetails = {
              ...suggestion,
              dateTime: eventDateTime.toISOString(),
            };

            let recurringCreationResult;
            // For recurring events, we'll respect the overrideOverlap flag from the initial request.
            // If the user said "Create Anyway" for the first event, subsequent should also override.
            if (recurringEventDetails.attendees && recurringEventDetails.attendees.length > 0) {
              console.log("Controller - Calling createCalendarMeeting for recurring event with overrideOverlap:", overrideOverlap);
              recurringCreationResult = await calendarService.createCalendarMeeting(
                googleOAuthClient,
                req.user.id,
                recurringEventDetails,
                overrideOverlap // Pass override to ensure subsequent creations also respect it
              );
            } else {
              console.log("Controller - Calling createCalendarEvent for recurring event with overrideOverlap:", overrideOverlap);
              recurringCreationResult = await calendarService.createCalendarEvent(
                googleOAuthClient,
                req.user.id,
                recurringEventDetails,
                overrideOverlap
              );
            }

            if (recurringCreationResult.data) {
              calendarLinks.push(recurringCreationResult.data.htmlLink);
            } else if (!overrideOverlap && recurringCreationResult.action === "confirm_create") {
                // If an overlap occurs mid-recurrence and no override, stop further recurrence
                console.warn(`⚠️ Stopping recurrence due to overlap on day ${i + 1} and no override was requested.`);
                break; // Stop further recurring events
            } else if (overrideOverlap && recurringCreationResult.action === "confirm_create") {
              // This case should ideally not happen if overrideOverlap is correctly handled in service.
              // Log a warning if it does, but continue trying to create (as user explicitly said create anyway).
              console.warn(`⚠️ Unexpected: Overlap detected for recurring event on day ${i + 1} despite overrideOverlap. Attempting to force.`);
              // No break here, as overrideOverlap is true, we should attempt to create it anyway.
            }
          }

          console.log("✅ Events created:", calendarLinks);
          return res.json({ success: true, calendarLinks: calendarLinks, feedback: initialCreationResult.feedback });
        } else {
          // This else block handles cases where initialCreationResult has no data and no confirm_create action
          return res.status(500).json({ success: false, feedback: "Failed to create event for unknown reason." });
        }
      }
    } catch (error) {
      console.error("❌ Error in /calendar-request:", error.message, error.stack);
      res.status(500).json({ success: false, feedback: "Failed to process calendar request", error: error.message });
    }
  },
};

module.exports = calendarController;

