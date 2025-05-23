import React, { createContext, useContext, useMemo, useState } from 'react';

// Define event types
export type EventType = 'music' | 'art' | 'theater' | 'dance' | 'workshop' | 'festival' | 'exhibition' | 'film' | 'literature' | 'other';

// Define event schedule (for events with multiple dates)
export type EventSchedule = {
  date: string; // ISO format: "2025-05-15T19:00:00"
  endDate?: string; // Optional end date/time
};

// Define the organizer type
export type Organizer = {
  id: string;
  name: string;
  profileImage?: string;
};

// Define accessibility options
export type AccessibilityFeature = 'wheelchair' | 'hearing' | 'visual' | 'parking' | 'restroom' | 'seating';

// Define ticket information
export type TicketInfo = {
  type: 'free' | 'paid' | 'donation';
  price?: number; // If paid, the price
  currency?: string; // EUR, USD, etc.
  purchaseLink?: string; // URL to purchase tickets
  onSiteAvailable?: boolean; // If tickets are available at the venue
};

// Define the event type
export type Event = {
  id: string;
  title: string;
  type: EventType;
  schedule: EventSchedule[];
  location: string;
  description: string;
  organizer: Organizer;
  professionals?: string[]; // Cultural professionals involved
  accessibility: AccessibilityFeature[];
  ticketInfo: TicketInfo;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  image?: string; // URL to event image
};

// Sample event data with comprehensive information
export const SAMPLE_EVENTS: Event[] = [
  { 
    id: '1', 
    title: 'Art Exhibition: Modern Perspectives',
    type: 'exhibition',
    schedule: [
      { date: '2025-05-15T10:00:00', endDate: '2025-05-15T20:00:00' },
      { date: '2025-05-16T10:00:00', endDate: '2025-05-16T20:00:00' },
      { date: '2025-05-17T10:00:00', endDate: '2025-05-17T20:00:00' }
    ],
    location: 'City Gallery, Main St 42',
    description: 'Featuring works from local artists exploring modern themes and techniques. Curated by Maria Santos, with installations by João Silva and Ana Martins.',
    organizer: {
      id: 'org1',
      name: 'City Arts Association',
      profileImage: 'https://example.com/caa.png'
    },
    professionals: ['Maria Santos (Curator)', 'João Silva (Artist)', 'Ana Martins (Artist)'],
    accessibility: ['wheelchair', 'hearing', 'parking'],
    ticketInfo: {
      type: 'paid',
      price: 8.50,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/exhibition',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 48.817607,
      longitude: 9.026766,
    },
    image: 'https://www.bizzabo.com/wp-content/uploads/2021/09/event-marketing-examples-fundraising-gala-min.png'
  },
  { 
    id: '2', 
    title: 'Summer Music Festival',
    type: 'music',
    schedule: [
      { date: '2025-06-20T17:00:00', endDate: '2025-06-20T23:00:00' },
      { date: '2025-06-21T16:00:00', endDate: '2025-06-21T23:30:00' }
    ],
    location: 'Central Park Amphitheater',
    description: 'Annual music festival featuring 12 bands across two days. Headliners include The Rolling Notes and Electric Symphony.',
    organizer: {
      id: 'org2',
      name: 'SoundWave Productions',
      profileImage: 'https://example.com/soundwave.png'
    },
    professionals: ['DJ Martinez', 'The Rolling Notes', 'Electric Symphony', 'Sound engineer: Miguel Costa'],
    accessibility: ['wheelchair', 'restroom', 'seating'],
    ticketInfo: {
      type: 'paid',
      price: 25,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/musicfest',
      onSiteAvailable: false
    },
    coordinates: {
      latitude: 48.817507, 
      longitude: 9.025529,
    },
    image: 'https://youthincmag.com/wp-content/uploads/2019/02/Top-10-Colege-Fests-India.jpg'
  },
  { 
    id: '3', 
    title: 'Traditional Crafts Workshop',
    type: 'workshop',
    schedule: [
      { date: '2025-05-28T14:00:00', endDate: '2025-05-28T17:00:00' }
    ],
    location: 'Community Center, Room 3B',
    description: 'Learn traditional crafts and cooking techniques from master artisans. Materials provided, suitable for beginners.',
    organizer: {
      id: 'org3',
      name: 'Cultural Heritage Foundation',
      profileImage: 'https://example.com/chf.png'
    },
    professionals: ['Luísa Ferreira (Master Artisan)', 'Carlos Duarte (Chef)'],
    accessibility: ['wheelchair', 'parking', 'restroom'],
    ticketInfo: {
      type: 'free',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 48.815906273661504, 
      longitude: 9.024082266173172,
    },
    image: 'https://tripjive.com/wp-content/uploads/2024/01/Tainan-traditional-crafts-and-workshops-for-hands-on-learning-experiences.jpg'
  },
  {
    id: '4',
    title: 'Contemporary Dance Performance',
    type: 'dance',
    schedule: [
      { date: '2025-06-05T19:30:00', endDate: '2025-06-05T21:00:00' }
    ],
    location: 'Municipal Theater, Main Hall',
    description: 'An innovative dance performance combining traditional and modern techniques. Choreographed by Sofia Mendes and performed by the Municipal Dance Company.',
    organizer: {
      id: 'org4',
      name: 'Municipal Theater',
      profileImage: 'https://example.com/theater.png'
    },
    professionals: ['Sofia Mendes (Choreographer)', 'Municipal Dance Company', 'Lighting Designer: Roberto Luz'],
    accessibility: ['wheelchair', 'hearing', 'seating'],
    ticketInfo: {
      type: 'paid',
      price: 15,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/dance',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 48.818507,
      longitude: 9.027529,
    },
    image: 'https://dt7savnbjquj3.cloudfront.net/_imager/files/442108/MAK01_9eed5a99b701ba360780d44a67c674dc.jpg'
  },
  {
    id: '5',
    title: 'Literary Evening: Local Authors',
    type: 'literature',
    schedule: [
      { date: '2025-05-22T18:00:00', endDate: '2025-05-22T20:30:00' }
    ],
    location: 'Municipal Library, Reading Room',
    description: 'Join us for readings and discussions with local authors. Books will be available for purchase and signing.',
    organizer: {
      id: 'org5',
      name: 'Friends of the Library',
      profileImage: 'https://example.com/library.png'
    },
    professionals: ['Margarida Sousa (Author)', 'António Dias (Author)', 'Carolina Anjos (Moderator)'],
    accessibility: ['wheelchair', 'hearing'],
    ticketInfo: {
      type: 'donation',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 48.716607,
      longitude: 9.025166,
    },
    image: 'https://www.herechattanooga.com/wp-content/uploads/2025/02/ishmael-reed-event.webp.webp'
  }
];

// Define filter state type
type FilterState = {
  selectedTypes: Array<EventType | 'all'>;
  mapFilterEnabled: boolean;
};

// Create context
type EventContextType = {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  // Add filter-related properties
  filters: FilterState;
  setSelectedTypes: (types: Array<EventType | 'all'>) => void;
  setMapFilterEnabled: (enabled: boolean) => void;
  filteredEvents: Event[]; // Pre-filtered events based on current filters
};

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>(SAMPLE_EVENTS);
  
  // Add filter state
  const [filters, setFilters] = useState<FilterState>({
    selectedTypes: ['all'],
    mapFilterEnabled: true
  });

  // Filter update methods
  const setSelectedTypes = (types: Array<EventType | 'all'>) => {
    setFilters(prev => ({ ...prev, selectedTypes: types }));
  };

  const setMapFilterEnabled = (enabled: boolean) => {
    setFilters(prev => ({ ...prev, mapFilterEnabled: enabled }));
  };

  // Calculate filtered events (memoized to prevent unnecessary recalculations)
  const filteredEvents = useMemo(() => {
    // Sort events by earliest date first
    const sortedEvents = [...events].sort((a, b) => {
      const aDate = a.schedule && a.schedule.length > 0 ? new Date(a.schedule[0].date) : new Date();
      const bDate = b.schedule && b.schedule.length > 0 ? new Date(b.schedule[0].date) : new Date();
      return aDate.getTime() - bDate.getTime();
    });
    
    // Filter events
    return sortedEvents.filter(event => {
      // Type filter: event passes if 'all' is selected or its type is in selectedTypes
      const passesTypeFilter = filters.selectedTypes.includes('all') || 
                              filters.selectedTypes.includes(event.type);
      
      // Map filter: when enabled, use distance-based filtering (mocked implementation)
      const passesMapFilter = !filters.mapFilterEnabled || 
                             (event.id.charCodeAt(0) % 2 === 0); // Mock implementation
      
      // Event must pass BOTH filters
      return passesTypeFilter && passesMapFilter;
    });
  }, [events, filters.selectedTypes, filters.mapFilterEnabled]);

  return (
    <EventContext.Provider value={{ 
      events, 
      setEvents, 
      filters,
      setSelectedTypes,
      setMapFilterEnabled,
      filteredEvents
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};