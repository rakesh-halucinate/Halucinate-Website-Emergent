export interface Product {
  id: string;
  name: string;
  tag: string;
  description: string;
  price_label: string;
  image_url: string;
  hashtags: string[];
  sort_order: number;
  created_at?: string;
}

export interface SeoPublic {
  meta_title: string;
  meta_description: string;
  keywords: string;
  hashtags: string[];
  competitors: string[];
}

export interface Inquiry {
  id: string;
  products: string[];
  name: string;
  company?: string;
  email: string;
  mobile: string;
  city?: string;
  state?: string;
  budget?: string;
  space?: string;
  install_date?: string;
  message: string;
  status: string;
  created_at: string;
}

export const BUDGET_OPTIONS = [
  "Under ₹5 lakh",
  "₹5 – 10 lakh",
  "₹10 – 25 lakh",
  "₹25 – 50 lakh",
  "Above ₹50 lakh",
  "Not decided yet",
];

export const FAQS = [
  {
    q: "Are these complete turnkey solutions?",
    a: "Yes. Every Halucinate product is delivered turnkey: hardware, software, networking, installation, operator training and technical support are all included.",
  },
  {
    q: "Are the displayed prices final?",
    a: "No. All prices are indicative starting prices and may vary based on specifications, hardware configuration, space, location, transportation, installation, customisation and applicable taxes. GST is charged additionally wherever applicable.",
  },
  {
    q: "Do you provide installation across India?",
    a: "Yes. Halucinate designs, ships and installs attractions across India for malls, entertainment centres, resorts and destinations.",
  },
  {
    q: "Can the products be customised?",
    a: "Yes. Themes, game content, branding, room concepts and configurations can all be customised to your space, audience and budget.",
  },
  {
    q: "Do you provide support after installation?",
    a: "Yes. Every installation includes operator training and ongoing technical support, and new games and experiences can be added as platforms expand.",
  },
  {
    q: "Which products are suitable for Tier 2 cities?",
    a: "Single-Player VR Games, the AI Photo Booth and the Self-Service Massage Chair Kiosk are compact, affordable attractions designed especially for Tier 2 cities and new entertainment businesses.",
  },
  {
    q: "Can I request multiple products in one quotation?",
    a: "Yes. Select one or more products in the enquiry form and our team will respond with combined options, general pricing and next steps.",
  },
  {
    q: "Are event activations available for short-term rental?",
    a: "Yes. Custom Event Activations can be designed for anything from a one-day corporate engagement to a month-long mall activation.",
  },
];

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "fb-1", name: "Multiplayer Free Roam VR", tag: "Most Selling", sort_order: 1,
    price_label: "₹9,80,000", image_url: "/assets/products/missionx-keyart.png",
    hashtags: ["#FreeRoamVR", "#VRGaming", "#MultiplayerVR", "#VRIndia"],
    description: "Multiplayer Free Roam VR transforms an open play area into a completely wireless virtual gaming arena where four or more players can move, compete and interact together. The system supports multiplayer laser tag, zombie shooting, team battles, scary experiences and virtual escape-room adventures. Players wear wireless VR headsets and use specially designed controllers or VR weapons without being restricted by cables. It is ideal for gaming centres, malls, resorts, family entertainment centres and high-footfall attractions. The complete turnkey system includes hardware, gaming software, networking, installation, operator training and technical support.",
  },
  {
    id: "fb-2", name: "Single-Player VR Games", tag: "Compact Attractions", sort_order: 2,
    price_label: "₹3,00,000 onwards", image_url: "/assets/products/single-player-vr.jpg",
    hashtags: ["#VRGames", "#VRCricket", "#Tier2Cities", "#GamingCenter"],
    description: "Affordable, compact entertainment attractions designed especially for Tier 2 cities, smaller gaming centres, malls and new entertainment businesses. The portfolio includes VR cricket with a wireless bat, VR shooting with a haptic-feedback gun, Horror Sofa experiences, racing car simulators, VR archery, Walk the Plank and other immersive games.",
  },
  {
    id: "fb-3", name: "AI Photo Booth", tag: "AI Experiences", sort_order: 3,
    price_label: "₹5,50,000", image_url: "/assets/products/ai-photo-booth.jpg",
    hashtags: ["#AIPhotoBooth", "#EventTech", "#AIMarketing", "#PhotoBooth"],
    description: "A fully automated photo experience developed for malls, events, tourist destinations, retail spaces and entertainment centres. Customers can select AI portraits, face-swap experiences, creative background transformations or regular photo-strip formats, with payment, AI processing, printing and digital delivery through a simple touchscreen interface.",
  },
  {
    id: "fb-4", name: "Physical Escape Rooms", tag: "Escape Rooms", sort_order: 4,
    price_label: "₹8,00,000 per room", image_url: "/assets/products/escape-rooms.jpg",
    hashtags: ["#EscapeRooms", "#EscapeRoomIndia", "#TeamBuilding", "#MysteryRooms"],
    description: "Complete Physical Escape Rooms combining storytelling, themed interiors, mechanical challenges, electronic puzzles, sensors, sound effects, lighting and automated control systems. Every room can be developed around a customised concept such as horror, mystery, adventure, science fiction or treasure hunting.",
  },
  {
    id: "fb-5", name: "Digital Scary House", tag: "Immersive Attractions", sort_order: 5,
    price_label: "₹15,00,000, depending on area", image_url: "/assets/products/scary-house.jpg",
    hashtags: ["#ScaryHouse", "#HauntedHouse", "#ProjectionMapping", "#HorrorExperience"],
    description: "The Digital Scary House combines projection mapping, digital horror content, physical effects, immersive sound, interactive puzzles and automated control technology to create a modern walkthrough attraction with projection-based rooms, digital characters, smoke effects, UV lighting and hidden triggers.",
  },
  {
    id: "fb-6", name: "Self-Service Massage Chair Kiosk", tag: "Automated Kiosks", sort_order: 6,
    price_label: "₹4,25,000 for two chairs", image_url: "/assets/products/massage-kiosk.jpg",
    hashtags: ["#MassageChair", "#AutomatedKiosk", "#PassiveIncome", "#MallBusiness"],
    description: "A completely automated relaxation and revenue solution designed for cinemas, malls, airports, hospitals, corporate spaces and high-footfall public locations. Customers scan a QR code, select a massage duration, complete payment and use the chair without staff assistance.",
  },
  {
    id: "fb-7", name: "Custom Event Activations", tag: "Event Activations", sort_order: 7,
    price_label: "Based on requirement", image_url: "/assets/products/event-activation.jpg",
    hashtags: ["#EventActivation", "#BrandActivation", "#CorporateEvents", "#ExperientialMarketing"],
    description: "Customised technology-based event activations for malls, corporate events, exhibitions, brand launches, festivals, schools and private celebrations — multiplayer VR, VR cricket, racing simulators, AI photo booths, projection-based attractions and branded installations.",
  },
  {
    id: "fb-8", name: "Super Reality 360 Dome", tag: "Large-Format Attractions", sort_order: 8,
    price_label: "₹50,00,000", image_url: "/assets/products/dome.jpg",
    hashtags: ["#360Dome", "#ImmersiveDome", "#Fulldome", "#ProjectionDome"],
    description: "A large-format immersive attraction where projection surrounds visitors across the dome walls, creating a powerful shared visual experience — educational films, fantasy journeys, space experiences, underwater adventures and cinematic attractions.",
  },
  {
    id: "fb-9", name: "Immersive Room", tag: "Projection Environments", sort_order: 9,
    price_label: "₹15,00,000", image_url: "/assets/products/immersive-room.jpg",
    hashtags: ["#ImmersiveRoom", "#ProjectionMapping", "#ImmersiveExperience", "#LocationBasedEntertainment"],
    description: "The Immersive Room converts a compact physical space into a projection-based environment using synchronised visuals across multiple walls and, where required, the floor — for gaming, education, storytelling, tourism, wellness and brand experiences.",
  },
];
