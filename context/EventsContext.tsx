import { supabase } from '@/lib/supabase';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

// Point-in-polygon algorithm (ray casting)
const isPointInPolygon = (point: { latitude: number; longitude: number }, polygon: Array<{ latitude: number; longitude: number }>): boolean => {
  if (polygon.length < 3) return false;
  
  const { latitude: x, longitude: y } = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { latitude: xi, longitude: yi } = polygon[i];
    const { latitude: xj, longitude: yj } = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

// Country-City mapping (in a real app, this would come from a database or API)
const COUNTRY_CITIES: Record<string, string[]> = {
  'Portugal': ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Faro', 'Aveiro', 'Évora', 'Viseu'],
  'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga', 'Zaragoza', 'Granada'],
  'France': ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Bordeaux'],
  'Italy': ['Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze'],
  'Germany': ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Dortmund'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool', 'Edinburgh', 'Bristol', 'Cardiff'],
  'Netherlands': ['Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere'],
  'Belgium': ['Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven'],
};

/*************/
/*** TYPES ***/
/*************/

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
  city: string; // Must match one of the cities in COUNTRY_CITIES
  country: string; // Must match one of the countries in COUNTRY_CITIES
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

// Define filter state type
type FilterState = {
  selectedTypes: Array<EventType | 'all'>;
  mapFilterEnabled: boolean;
  drawingMode: boolean;
  selectedCity: string | 'all';
  polygonCoords: Array<{ latitude: number; longitude: number }>;
  savedPolygons: Array<Array<{ latitude: number; longitude: number }>>;
  shouldNavigateToMap: boolean;
  selectedCountry: string;
};

// Create context
type EventsContextType = {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  addEvent: (event: Omit<Event, 'id'>) => Promise<Event>;
  filters: FilterState;
  setSelectedTypes: (types: Array<EventType | 'all'>) => void;
  setMapFilterEnabled: (enabled: boolean) => void;
  setDrawingMode: (enabled: boolean) => void;
  setSelectedCity: (city: string) => void;
  setPolygonCoords: (coords: Array<{ latitude: number; longitude: number }>) => void;
  setSavedPolygons: (polygons: Array<Array<{ latitude: number; longitude: number }>>) => void;
  setShouldNavigateToMap: (should: boolean) => void;
  setSelectedCountry: (country: string) => void;
  filteredEvents: Event[];
  hasActiveTypeFilters: boolean;
  availableCities: string[];
  availableCountries: string[];
  loading: boolean;
  refreshEvents: () => Promise<void>;
};


// Sample event data with comprehensive information
export const SAMPLE_EVENTS: Event[] = [
  // PORTUGAL - Lisboa
  { 
    id: '1', 
    title: 'Art Exhibition: Modern Perspectives',
    type: 'exhibition',
    schedule: [
      { date: '2025-05-15T10:00:00', endDate: '2025-05-15T20:00:00' },
      { date: '2025-05-16T10:00:00', endDate: '2025-05-16T20:00:00' },
      { date: '2025-05-17T10:00:00', endDate: '2025-05-17T20:00:00' }
    ],
    location: 'Museu Nacional de Arte Antiga, Lisboa',
    city: 'Lisboa',
    country: 'Portugal',
    description: 'Featuring works from local artists exploring modern themes and techniques. Curated by Maria Santos, with installations by João Silva and Ana Martins.',
    organizer: {
      id: 'org1',
      name: 'Museu Nacional de Arte Antiga',
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
      latitude: 38.7139,
      longitude: -9.1394,
    },
    image: 'https://www.bizzabo.com/wp-content/uploads/2021/09/event-marketing-examples-fundraising-gala-min.png'
  },
  
  // PORTUGAL - Porto
  { 
    id: '2', 
    title: 'Summer Music Festival',
    type: 'music',
    schedule: [
      { date: '2025-06-20T17:00:00', endDate: '2025-06-20T23:00:00' },
      { date: '2025-06-21T16:00:00', endDate: '2025-06-21T23:30:00' }
    ],
    location: 'Parque da Cidade, Porto',
    city: 'Porto',
    country: 'Portugal',
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
      latitude: 41.1579,
      longitude: -8.6291,
    },
    image: 'https://youthincmag.com/wp-content/uploads/2019/02/Top-10-Colege-Fests-India.jpg'
  },
  
  // PORTUGAL - Coimbra
  { 
    id: '3', 
    title: 'Traditional Crafts Workshop',
    type: 'workshop',
    schedule: [
      { date: '2025-05-28T14:00:00', endDate: '2025-05-28T17:00:00' }
    ],
    location: 'Centro Cultural de Coimbra',
    city: 'Coimbra',
    country: 'Portugal',
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
      latitude: 40.2033,
      longitude: -8.4103,
    },
    image: 'https://tripjive.com/wp-content/uploads/2024/01/Tainan-traditional-crafts-and-workshops-for-hands-on-learning-experiences.jpg'
  },
  
  // SPAIN - Madrid
  {
    id: '4',
    title: 'Contemporary Dance Performance',
    type: 'dance',
    schedule: [
      { date: '2025-06-05T19:30:00', endDate: '2025-06-05T21:00:00' }
    ],
    location: 'Teatro Real, Madrid',
    city: 'Madrid',
    country: 'Spain',
    description: 'An innovative dance performance combining traditional and modern techniques. Choreographed by Sofia Mendes and performed by the Municipal Dance Company.',
    organizer: {
      id: 'org4',
      name: 'Teatro Real',
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
      latitude: 40.4168,
      longitude: -3.7038,
    },
    image: 'https://dt7savnbjquj3.cloudfront.net/_imager/files/442108/MAK01_9eed5a99b701ba360780d44a67c674dc.jpg'
  },
  
  // SPAIN - Barcelona
  {
    id: '5',
    title: 'Literary Evening: Local Authors',
    type: 'literature',
    schedule: [
      { date: '2025-05-22T18:00:00', endDate: '2025-05-22T20:30:00' }
    ],
    location: 'Biblioteca Nacional de Catalunya, Barcelona',
    city: 'Barcelona',
    country: 'Spain',
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
      latitude: 41.3851,
      longitude: 2.1734,
    },
    image: 'https://www.herechattanooga.com/wp-content/uploads/2025/02/ishmael-reed-event.webp.webp'
  },
  
  // FRANCE - Paris
  {
    id: '6',
    title: 'Photography Workshop: Street Photography',
    type: 'workshop',
    schedule: [
      { date: '2025-07-10T09:00:00', endDate: '2025-07-10T17:00:00' }
    ],
    location: 'Centre Pompidou, Paris',
    city: 'Paris',
    country: 'France',
    description: 'Master the art of street photography with professional photographer Jean-Pierre Dubois. Walk through Paris and capture the essence of urban life.',
    organizer: {
      id: 'org6',
      name: 'Centre Pompidou',
      profileImage: 'https://example.com/pompidou.png'
    },
    professionals: ['Jean-Pierre Dubois (Photographer)', 'Marie Claire (Assistant)'],
    accessibility: ['wheelchair', 'restroom'],
    ticketInfo: {
      type: 'paid',
      price: 45,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/photo',
      onSiteAvailable: false
    },
    coordinates: {
      latitude: 48.8606,
      longitude: 2.3522,
    },
    image: 'https://tripjive.com/wp-content/uploads/2024/01/Tainan-traditional-crafts-and-workshops-for-hands-on-learning-experiences.jpg'
  },
  
  // FRANCE - Lyon
  {
    id: '7',
    title: 'Jazz Night at the Opera',
    type: 'music',
    schedule: [
      { date: '2025-08-15T20:00:00', endDate: '2025-08-15T23:00:00' }
    ],
    location: 'Opéra de Lyon',
    city: 'Lyon',
    country: 'France',
    description: 'Exceptional jazz evening featuring the Lyon Jazz Quartet and special guest vocalist Isabelle Moreau.',
    organizer: {
      id: 'org7',
      name: 'Opéra de Lyon',
      profileImage: 'https://example.com/opera.png'
    },
    professionals: ['Lyon Jazz Quartet', 'Isabelle Moreau (Vocalist)', 'Claude Bernard (Sound Engineer)'],
    accessibility: ['wheelchair', 'hearing', 'seating'],
    ticketInfo: {
      type: 'paid',
      price: 35,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/jazz',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 45.7640,
      longitude: 4.8357,
    },
    image: 'https://youthincmag.com/wp-content/uploads/2019/02/Top-10-Colege-Fests-India.jpg'
  },
  
  // ITALY - Roma
  {
    id: '8',
    title: 'Classical Theater: Romeo and Juliet',
    type: 'theater',
    schedule: [
      { date: '2025-09-12T19:00:00', endDate: '2025-09-12T22:00:00' },
      { date: '2025-09-13T19:00:00', endDate: '2025-09-13T22:00:00' }
    ],
    location: 'Teatro dell\'Opera di Roma',
    city: 'Roma',
    country: 'Italy',
    description: 'Shakespeare\'s timeless tragedy performed by the renowned Roma Theater Company. Directed by Alessandro Gassmann.',
    organizer: {
      id: 'org8',
      name: 'Teatro dell\'Opera di Roma',
      profileImage: 'https://example.com/opera-roma.png'
    },
    professionals: ['Alessandro Gassmann (Director)', 'Roma Theater Company', 'Costume Designer: Lucia Vestri'],
    accessibility: ['wheelchair', 'hearing', 'seating'],
    ticketInfo: {
      type: 'paid',
      price: 28,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/romeo',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 41.9028,
      longitude: 12.4964,
    },
    image: 'https://dt7savnbjquj3.cloudfront.net/_imager/files/442108/MAK01_9eed5a99b701ba360780d44a67c674dc.jpg'
  },
  
  // ITALY - Milano
  {
    id: '9',
    title: 'Fashion Design Exhibition',
    type: 'exhibition',
    schedule: [
      { date: '2025-09-20T10:00:00', endDate: '2025-09-20T19:00:00' },
      { date: '2025-09-21T10:00:00', endDate: '2025-09-21T19:00:00' },
      { date: '2025-09-22T10:00:00', endDate: '2025-09-22T19:00:00' }
    ],
    location: 'Palazzo Reale, Milano',
    city: 'Milano',
    country: 'Italy',
    description: 'Explore 50 years of Italian fashion design. From Versace to Prada, discover the evolution of Italian style.',
    organizer: {
      id: 'org9',
      name: 'Palazzo Reale',
      profileImage: 'https://example.com/palazzo.png'
    },
    professionals: ['Francesca Alfano Miglietti (Curator)', 'Roberto Capucci (Featured Designer)'],
    accessibility: ['wheelchair', 'hearing', 'parking', 'restroom'],
    ticketInfo: {
      type: 'paid',
      price: 12,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/fashion',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 45.4642,
      longitude: 9.1900,
    },
    image: 'https://www.bizzabo.com/wp-content/uploads/2021/09/event-marketing-examples-fundraising-gala-min.png'
  },
  
  // GERMANY - Berlin
  {
    id: '10',
    title: 'Electronic Music Festival',
    type: 'festival',
    schedule: [
      { date: '2025-08-25T14:00:00', endDate: '2025-08-26T06:00:00' }
    ],
    location: 'Tempelhof Airport, Berlin',
    city: 'Berlin',
    country: 'Germany',
    description: 'Two-day electronic music festival featuring top DJs from around the world. 6 stages, 48 hours of continuous music.',
    organizer: {
      id: 'org10',
      name: 'Berlin Electronic',
      profileImage: 'https://example.com/electronic.png'
    },
    professionals: ['Carl Cox', 'Nina Kraviz', 'Boris Brejcha', 'Charlotte de Witte'],
    accessibility: ['wheelchair', 'restroom', 'seating'],
    ticketInfo: {
      type: 'paid',
      price: 89,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/electronic',
      onSiteAvailable: false
    },
    coordinates: {
      latitude: 52.5200,
      longitude: 13.4050,
    },
    image: 'https://youthincmag.com/wp-content/uploads/2019/02/Top-10-Colege-Fests-India.jpg'
  },
  
  // GERMANY - München
  {
    id: '11',
    title: 'Film Screening: Independent Cinema',
    type: 'film',
    schedule: [
      { date: '2025-07-18T19:30:00', endDate: '2025-07-18T22:00:00' }
    ],
    location: 'Filmmuseum München',
    city: 'München',
    country: 'Germany',
    description: 'Special screening of award-winning independent films from European directors. Q&A session with filmmakers.',
    organizer: {
      id: 'org11',
      name: 'Filmmuseum München',
      profileImage: 'https://example.com/film.png'
    },
    professionals: ['Hans Weingartner (Director)', 'Fatih Akin (Director)', 'Moderator: Klaus Lemke'],
    accessibility: ['wheelchair', 'hearing'],
    ticketInfo: {
      type: 'paid',
      price: 8,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/film',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 48.1351,
      longitude: 11.5820,
    },
    image: 'https://www.herechattanooga.com/wp-content/uploads/2025/02/ishmael-reed-event.webp.webp'
  },
  
  // UNITED KINGDOM - London
  {
    id: '12',
    title: 'Shakespeare Festival',
    type: 'theater',
    schedule: [
      { date: '2025-06-14T19:00:00', endDate: '2025-06-14T22:30:00' },
      { date: '2025-06-15T14:00:00', endDate: '2025-06-15T17:30:00' },
      { date: '2025-06-15T19:00:00', endDate: '2025-06-15T22:30:00' }
    ],
    location: 'Globe Theatre, London',
    city: 'London',
    country: 'United Kingdom',
    description: 'Three-day celebration of Shakespeare\'s works. Multiple plays performed by the Royal Shakespeare Company.',
    organizer: {
      id: 'org12',
      name: 'Globe Theatre',
      profileImage: 'https://example.com/globe.png'
    },
    professionals: ['Royal Shakespeare Company', 'Kenneth Branagh (Guest Director)', 'Judi Dench (Special Guest)'],
    accessibility: ['wheelchair', 'hearing', 'seating'],
    ticketInfo: {
      type: 'paid',
      price: 42,
      currency: 'GBP',
      purchaseLink: 'https://tickets.example.com/shakespeare',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 51.5074,
      longitude: -0.1278,
    },
    image: 'https://dt7savnbjquj3.cloudfront.net/_imager/files/442108/MAK01_9eed5a99b701ba360780d44a67c674dc.jpg'
  },
  
  // NETHERLANDS - Amsterdam
  {
    id: '13',
    title: 'Contemporary Art Fair',
    type: 'exhibition',
    schedule: [
      { date: '2025-10-05T10:00:00', endDate: '2025-10-05T20:00:00' },
      { date: '2025-10-06T10:00:00', endDate: '2025-10-06T20:00:00' },
      { date: '2025-10-07T10:00:00', endDate: '2025-10-07T18:00:00' }
    ],
    location: 'RAI Amsterdam',
    city: 'Amsterdam',
    country: 'Netherlands',
    description: 'Annual contemporary art fair featuring 200+ galleries from around the world. Discover emerging and established artists.',
    organizer: {
      id: 'org13',
      name: 'Art Amsterdam Foundation',
      profileImage: 'https://example.com/artfair.png'
    },
    professionals: ['Various International Galleries', 'Roos Schurman (Curator)', 'Willem de Kooning Foundation'],
    accessibility: ['wheelchair', 'hearing', 'parking', 'restroom'],
    ticketInfo: {
      type: 'paid',
      price: 22,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/artfair',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 52.3676,
      longitude: 4.9041,
    },
    image: 'https://www.bizzabo.com/wp-content/uploads/2021/09/event-marketing-examples-fundraising-gala-min.png'
  },
  
  // BELGIUM - Brussels
  {
    id: '14',
    title: 'International Dance Workshop',
    type: 'workshop',
    schedule: [
      { date: '2025-11-12T10:00:00', endDate: '2025-11-12T18:00:00' },
      { date: '2025-11-13T10:00:00', endDate: '2025-11-13T18:00:00' }
    ],
    location: 'Théâtre Royal de la Monnaie, Brussels',
    city: 'Brussels',
    country: 'Belgium',
    description: 'Two-day intensive workshop with international choreographers. Learn contemporary, classical, and folk dance techniques.',
    organizer: {
      id: 'org14',
      name: 'European Dance Collective',
      profileImage: 'https://example.com/dance.png'
    },
    professionals: ['Anne Teresa de Keersmaeker (Choreographer)', 'Akram Khan (Guest Teacher)', 'Sidi Larbi Cherkaoui'],
    accessibility: ['wheelchair', 'restroom'],
    ticketInfo: {
      type: 'paid',
      price: 95,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/dance-workshop',
      onSiteAvailable: false
    },
    coordinates: {
      latitude: 50.8503,
      longitude: 4.3517,
    },
    image: 'https://tripjive.com/wp-content/uploads/2024/01/Tainan-traditional-crafts-and-workshops-for-hands-on-learning-experiences.jpg'
  },
  
  // More PORTUGAL events
  {
    id: '15',
    title: 'Fado Night in the Old Town',
    type: 'music',
    schedule: [
      { date: '2025-12-03T21:00:00', endDate: '2025-12-03T23:30:00' }
    ],
    location: 'Casa de Fado, Lisboa',
    city: 'Lisboa',
    country: 'Portugal',
    description: 'Authentic Fado performance in historic Alfama district. Traditional Portuguese music with renowned fadistas.',
    organizer: {
      id: 'org15',
      name: 'Casa de Fado',
      profileImage: 'https://example.com/fado.png'
    },
    professionals: ['Amália Today (Fadista)', 'Carlos do Carmo Jr. (Guitarist)', 'Teresa Salgueiro'],
    accessibility: ['hearing'],
    ticketInfo: {
      type: 'paid',
      price: 18,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/fado',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 38.7139,
      longitude: -9.1394,
    },
    image: 'https://youthincmag.com/wp-content/uploads/2019/02/Top-10-Colege-Fests-India.jpg'
  },
  
  {
    id: '16',
    title: 'Portuguese Tile Painting Workshop',
    type: 'workshop',
    schedule: [
      { date: '2025-08-08T14:00:00', endDate: '2025-08-08T17:00:00' }
    ],
    location: 'Museu Nacional do Azulejo, Lisboa',
    city: 'Lisboa',
    country: 'Portugal',
    description: 'Learn the traditional art of Portuguese azulejo tile painting. Create your own decorative tiles to take home.',
    organizer: {
      id: 'org16',
      name: 'Museu Nacional do Azulejo',
      profileImage: 'https://example.com/azulejo.png'
    },
    professionals: ['Master Ceramist João Cutileiro', 'Tile Artist Maria Keil Foundation'],
    accessibility: ['wheelchair', 'parking', 'restroom'],
    ticketInfo: {
      type: 'paid',
      price: 32,
      currency: 'EUR',
      purchaseLink: 'https://tickets.example.com/azulejo',
      onSiteAvailable: true
    },
    coordinates: {
      latitude: 38.7139,
      longitude: -9.1394,
    },
    image: 'https://tripjive.com/wp-content/uploads/2024/01/Tainan-traditional-crafts-and-workshops-for-hands-on-learning-experiences.jpg'
  }
];



const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const EventProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();
  
  // Add filter state
  const [filters, setFilters] = useState<FilterState>({
    selectedTypes: ['all'],
    mapFilterEnabled: false,
    drawingMode: false,
    selectedCity: 'all',
    polygonCoords: [],
    savedPolygons: [],
    shouldNavigateToMap: false,
    selectedCountry: 'Portugal', // Default country
  });

  // Transform database response to Event type
  const transformEventData = (dbEvent: any): Event => {
    return {
      id: dbEvent.id,
      title: dbEvent.title,
      type: dbEvent.type as EventType,
      schedule: dbEvent.event_schedules?.map((schedule: any) => ({
        date: schedule.start_date, // Correct column name
        endDate: schedule.end_date
      })) || [],
      location: dbEvent.location,
      city: dbEvent.city,
      country: dbEvent.country,
      description: dbEvent.description || '',
      organizer: {
        id: dbEvent.created_by || 'unknown',
        name: 'Event Organizer', // We don't have organizer name in the schema
        profileImage: undefined
      },
      professionals: [], // We don't store this in the basic schema
      accessibility: dbEvent.event_accessibility?.map((feature: any) => feature.feature as AccessibilityFeature) || [],
      ticketInfo: dbEvent.event_tickets?.[0] ? {
        type: dbEvent.event_tickets[0].type as 'free' | 'paid' | 'donation',
        price: dbEvent.event_tickets[0].price || undefined,
        currency: dbEvent.event_tickets[0].currency || undefined,
        purchaseLink: dbEvent.event_tickets[0].purchase_link || undefined,
        onSiteAvailable: dbEvent.event_tickets[0].on_site_available || false
      } : {
        type: 'free'
      },
      coordinates: dbEvent.coordinates_lat && dbEvent.coordinates_lng ? {
        latitude: parseFloat(dbEvent.coordinates_lat),
        longitude: parseFloat(dbEvent.coordinates_lng)
      } : undefined,
      image: dbEvent.image_url || undefined
    };
  };

  // Smart merge function to combine local and database events
  const mergeEventsSmartly = (currentEvents: Event[], databaseEvents: Event[]): Event[] => {
    // Start with database events as the source of truth
    const mergedEvents = [...databaseEvents];
    
    // Add any local events that aren't in the database yet
    currentEvents.forEach(localEvent => {
      const existsInDatabase = databaseEvents.some(dbEvent => dbEvent.id === localEvent.id);
      if (!existsInDatabase) {
        mergedEvents.push(localEvent);
      }
    });
    
    return mergedEvents;
  };

  // Fetch events from Supabase
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Test basic connection first
      const { data: testData, error: testError } = await supabase
        .from('events')
        .select('*')
        .limit(5);
      
      if (testError) {
        console.error('Basic connection test failed:', testError);
        setEvents(SAMPLE_EVENTS);
        return;
      }

      // Try the RPC function
      const { data, error } = await supabase.rpc('get_events_with_details');
      
      if (error) {
        console.error('RPC function error:', error);
        
        // Fallback to basic query with manual joins
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select(`
            *,
            event_schedules(*),
            event_tickets(*),
            event_accessibility(*)
          `);
        
        if (eventsError) {
          console.error('Manual query also failed:', eventsError);
          setEvents(SAMPLE_EVENTS);
          return;
        }

        if (eventsData) {
          const transformedEvents = eventsData.map(transformEventData);
          setEvents(currentEvents => mergeEventsSmartly(currentEvents, transformedEvents));
        }
        return;
      }

      if (data) {
        const transformedEvents = data.map(transformEventData);
        setEvents(currentEvents => mergeEventsSmartly(currentEvents, transformedEvents));
      } else {
        setEvents(SAMPLE_EVENTS);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents(SAMPLE_EVENTS);
    } finally {
      setLoading(false);
    }
  };

  // Refresh events (for manual refresh)
  const refreshEvents = async () => {
    await fetchEvents();
  };

  // Load events on component mount
  useEffect(() => {
    let isInitialized = false;
    
    const testConnection = async () => {
      if (isInitialized) return;
      isInitialized = true;
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select('count')
          .limit(1);
        
        if (error) {
          console.error('Supabase connection test failed:', error);
        }
      } catch (err) {
        console.error('Supabase connection test exception:', err);
      }
      
      fetchEvents();
    };
    
    testConnection();
  }, []);

  // Filter update methods
  const setSelectedTypes = (types: Array<EventType | 'all'>) => {
    setFilters(prev => ({ ...prev, selectedTypes: types }));
  };

  const setMapFilterEnabled = (enabled: boolean) => {
    setFilters(prev => ({ ...prev, mapFilterEnabled: enabled }));
  };

  const setDrawingMode = (enabled: boolean) => {
    setFilters(prev => ({ ...prev, drawingMode: enabled }));
  };

  const setSelectedCity = (city: string) => {
    setFilters(prev => ({ ...prev, selectedCity: city }));
  };

  const setPolygonCoords = (coords: Array<{ latitude: number; longitude: number }>) => {
    setFilters(prev => ({ ...prev, polygonCoords: coords }));
  };

  const setSavedPolygons = (polygons: Array<Array<{ latitude: number; longitude: number }>>) => {
    setFilters(prev => ({ ...prev, savedPolygons: polygons }));
  };

  const setShouldNavigateToMap = (should: boolean) => {
    setFilters(prev => ({ ...prev, shouldNavigateToMap: should }));
  };

  const setSelectedCountry = (country: string) => {
    setFilters(prev => ({ ...prev, selectedCountry: country, selectedCity: 'all' })); // Reset city when country changes
  };

  // Add a new event to Supabase and update local state
  const addEvent = async (eventData: Omit<Event, 'id'>) => {
    if (!user) {
      throw new Error('User must be logged in to create events');
    }

    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        console.error('User authentication issue:', userError);
        throw new Error('Authentication failed. Please sign in again.');
      }

      const eventPayload = {
        title: eventData.title,
        type: eventData.type,
        description: eventData.description || 'No description provided',
        location: eventData.location,
        city: eventData.city,
        country: eventData.country,
        coordinates_lat: eventData.coordinates?.latitude || null,
        coordinates_lng: eventData.coordinates?.longitude || null,
        image_url: eventData.image || null,
        created_by: currentUser.id,
      };

      const { data: eventRecord, error: eventError } = await supabase
        .from('events')
        .insert(eventPayload)
        .select()
        .single();

      if (eventError) {
        console.error('Failed to create event:', eventError);
        throw new Error(`Failed to create event: ${eventError.message || 'Unknown database error'}`);
      }

      // Insert schedules
      if (eventData.schedule && eventData.schedule.length > 0) {
        const schedulePromises = eventData.schedule.map(async (schedule) => {
          const { error } = await supabase
            .from('event_schedules')
            .insert({
              event_id: eventRecord.id,
              start_date: schedule.date,
              end_date: schedule.endDate || null,
            });
          if (error) {
            console.error('Schedule insertion error:', error);
          }
          return error;
        });
        
        const scheduleResults = await Promise.all(schedulePromises);
        const scheduleErrors = scheduleResults.filter(Boolean);
        if (scheduleErrors.length > 0) {
          console.warn('Some schedule insertions failed:', scheduleErrors);
        }
      }

      // Insert ticket information
      if (eventData.ticketInfo) {
        const { error: ticketError } = await supabase
          .from('event_tickets')
          .insert({
            event_id: eventRecord.id,
            type: eventData.ticketInfo.type,
            price: eventData.ticketInfo.price || null,
            currency: eventData.ticketInfo.currency || null,
            purchase_link: eventData.ticketInfo.purchaseLink || null,
            on_site_available: eventData.ticketInfo.onSiteAvailable || false,
          });
        
        if (ticketError) {
          console.error('Ticket insertion error:', ticketError);
        }
      }

      // Insert accessibility features
      if (eventData.accessibility && eventData.accessibility.length > 0) {
        const accessibilityPromises = eventData.accessibility.map(async (featureType) => {
          const { error } = await supabase
            .from('event_accessibility')
            .insert({
              event_id: eventRecord.id,
              feature: featureType,
            });
          if (error) {
            console.error('Accessibility insertion error:', error);
          }
          return error;
        });
        
        const accessibilityResults = await Promise.all(accessibilityPromises);
        const accessibilityErrors = accessibilityResults.filter(Boolean);
        if (accessibilityErrors.length > 0) {
          console.warn('Some accessibility insertions failed:', accessibilityErrors);
        }
      }

      console.log('Database returned event record:', eventRecord);
      console.log('Event record ID:', eventRecord.id, 'Type:', typeof eventRecord.id);

      // Create a properly formatted local event object that matches database structure
      const localEvent: Event = {
        id: String(eventRecord.id), // Ensure ID is always a string
        title: eventData.title,
        type: eventData.type,
        schedule: eventData.schedule || [],
        location: eventData.location,
        city: eventData.city,
        country: eventData.country,
        description: eventData.description,
        organizer: {
          id: currentUser.id,
          name: currentUser.user_metadata?.displayName || 'Event Organizer',
          profileImage: undefined
        },
        professionals: eventData.professionals || [],
        accessibility: eventData.accessibility || [],
        ticketInfo: eventData.ticketInfo,
        coordinates: eventData.coordinates,
        image: eventData.image,
      };

      // Add to local state immediately for instant UI update
      setEvents(prevEvents => [...prevEvents, localEvent]);

      // Background refresh to sync with database
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.rpc('get_events_with_details');
          
          if (error) {
            console.error('Background refresh error:', error);
            return;
          }

          if (data && data.length > 0) {
            const transformedEvents: Event[] = data
              .map(transformEventData)
              .filter(Boolean) as Event[];
            
            setEvents(currentEvents => mergeEventsSmartly(currentEvents, transformedEvents));
          }
        } catch (error) {
          console.error('Background refresh failed:', error);
        }
      }, 2000);

      // Return the created event so the form can use it for navigation
      return localEvent;

    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  // Calculate available cities based on selected country
  const availableCities = useMemo(() => {
    return COUNTRY_CITIES[filters.selectedCountry] || [];
  }, [filters.selectedCountry]);

  // Calculate available countries
  const availableCountries = useMemo(() => {
    return Object.keys(COUNTRY_CITIES).sort();
  }, []);

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
      
      // Country filter: only show events from selected country
      const passesCountryFilter = event.country === filters.selectedCountry;
      
      // City filter: event passes if 'all' is selected or its city matches
      const passesCityFilter = filters.selectedCity === 'all' || 
                              event.city === filters.selectedCity;
      
      // Map filter: when enabled, check if event is within drawn polygon
      const passesMapFilter = !filters.mapFilterEnabled || 
                             (filters.polygonCoords.length > 2 && 
                              event.coordinates &&
                              isPointInPolygon(
                                { latitude: event.coordinates.latitude, longitude: event.coordinates.longitude }, 
                                filters.polygonCoords
                              ));
      
      // Event must pass ALL filters
      return passesTypeFilter && passesCountryFilter && passesCityFilter && passesMapFilter;
    });
  }, [events, filters.selectedTypes, filters.selectedCountry, filters.selectedCity, filters.mapFilterEnabled, filters.polygonCoords]);

  const hasActiveTypeFilters = useMemo(() => {
    return !(filters.selectedTypes.length === 1 && filters.selectedTypes.includes('all')) ||
           filters.selectedCity !== 'all' ||
           filters.mapFilterEnabled;
  }, [filters.selectedTypes, filters.selectedCity, filters.mapFilterEnabled]);

  return (
    <EventsContext.Provider value={{ 
      events, 
      setEvents,
      addEvent, 
      filters,
      setSelectedTypes,
      setMapFilterEnabled,
      setDrawingMode,
      setSelectedCity,
      setPolygonCoords,
      setSavedPolygons,
      setShouldNavigateToMap,
      setSelectedCountry,
      filteredEvents,
      hasActiveTypeFilters,
      availableCities,
      availableCountries,
      loading,
      refreshEvents
    }}>
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};