// Simple analytics service
// Replace the track function implementation with your analytics provider (Segment, Mixpanel, etc.)

type EventName =
  | 'client_selected'
  | 'meeting_prep_started'
  | 'meeting_prep_success'
  | 'meeting_prep_failed'
  | 'meeting_prep_saved_as_note'
  | 'meeting_prep_regenerated'
  | 'interaction_added'
  | 'interaction_deleted'
  | 'interaction_viewed'
  | 'client_added'
  | 'client_deleted'
  | 'add_client_modal_opened'
  | 'add_interaction_form_opened'
  | 'doc_onboarding_opened'
  | 'client_added_from_docs';

interface EventProperties {
  clientId?: string;
  clientName?: string;
  interactionType?: string;
  error?: string;
  duration?: number;
  [key: string]: string | number | boolean | undefined;
}

// Track an analytics event
export function track(event: EventName, properties?: EventProperties): void {
  const timestamp = new Date().toISOString();
  const payload = {
    event,
    properties: properties || {},
    timestamp,
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('%c[Analytics]', 'color: #8b5cf6; font-weight: bold;', event, properties || '');
  }

  // Store events in sessionStorage for debugging
  try {
    const events = JSON.parse(sessionStorage.getItem('analytics_events') || '[]');
    events.push(payload);
    // Keep only last 100 events
    if (events.length > 100) events.shift();
    sessionStorage.setItem('analytics_events', JSON.stringify(events));
  } catch {
    // Ignore storage errors
  }

  // TODO: Send to your analytics provider
  // Example with Segment:
  // window.analytics?.track(event, properties);
  
  // Example with Mixpanel:
  // mixpanel?.track(event, properties);
  
  // Example with custom endpoint:
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // }).catch(() => {});
}

// Get all tracked events (for debugging)
export function getTrackedEvents(): Array<{ event: string; properties: EventProperties; timestamp: string }> {
  try {
    return JSON.parse(sessionStorage.getItem('analytics_events') || '[]');
  } catch {
    return [];
  }
}

// Clear tracked events
export function clearTrackedEvents(): void {
  sessionStorage.removeItem('analytics_events');
}

