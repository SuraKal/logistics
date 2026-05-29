export const SECTION_IMAGES = {
  hero: {
    src: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=80",
    alt: "Heavy freight trucks moving along a highway",
    title: "Fleet operations",
    subtitle: "Keep client cargo moving on schedule.",
  },
  vehicles: {
    src: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
    alt: "Large cargo trucks parked in a fleet yard",
    title: "Vehicles",
    subtitle: "Heavy trucks ready for the next load.",
  },
  trips: {
    src: "https://images.unsplash.com/photo-1501706362039-c6e80992a0dd?auto=format&fit=crop&w=1200&q=80",
    alt: "Cargo truck on a wide highway",
    title: "Trips",
    subtitle: "Line up routes and watch loads reach clients.",
  },
  garage: {
    src: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
    alt: "Heavy truck being serviced in a workshop",
    title: "Garage jobs",
    subtitle: "Keep truck repairs, parts, and notes in one place.",
  },
  drivers: {
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
    alt: "Close-up portrait of a professional truck driver",
    title: "Drivers",
    subtitle: "Keep every driver record and document handy.",
  },
  dashboard: {
    src: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    alt: "Fleet trucks waiting at a logistics terminal",
    title: "Workspace",
    subtitle: "A live logistics board for real fleet work.",
  },
  finance: {
    src: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    alt: "Logistics finance desk with invoices and delivery notes",
    title: "Finance",
    subtitle: "Track costs that keep the fleet moving.",
  },
};

export const getSectionImage = (section) => SECTION_IMAGES[section] || SECTION_IMAGES.hero;
