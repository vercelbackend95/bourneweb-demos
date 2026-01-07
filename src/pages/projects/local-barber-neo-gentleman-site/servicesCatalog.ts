export type ServiceCategoryKey = "cuts" | "beard_shave" | "extras";
export type ServiceBadge = "Most popular" | "Best value";

export type BookingService = {
  key: string;
  category: ServiceCategoryKey;
  name: string;
  mins: number;

  // numeric (for booking payload / sorting / logic)
  price: number;

  // display label (can be range like "£7–£15")
  priceLabel: string;

  // short UI copy
  desc: string;

  // longer copy (for future expansions / summaries)
  details: string;

  badge?: ServiceBadge;
};

export type ServiceCategory = {
  key: ServiceCategoryKey;
  label: string;
  blurb: string;
  img: string;
  services: BookingService[];
};

const gbp = (n: number) => `£${n}`;

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    key: "cuts",
    label: "CUTS",
    blurb: "Clean fades. Sharp lines. Zero drama.",
    img: "https://images.unsplash.com/photo-1599351431618-3174d19c93a5?auto=format&fit=crop&w=1400&q=80",
    services: [
      {
        key: "mens_haircut",
        category: "cuts",
        name: "Men’s haircut",
        mins: 45,
        price: 22,
        priceLabel: gbp(22),
        desc: "Classic cut, tidy finish.",
        details: "Classic cut with a clean neckline + tidy finish.",
      },
      {
        key: "mens_haircut_admiral",
        category: "cuts",
        name: "Men’s haircut “Admiral”",
        mins: 50,
        price: 26,
        priceLabel: gbp(26),
        desc: "Extra time, extra precision.",
        details: "More time for precision work and styling.",
      },
      {
        key: "skin_fade",
        category: "cuts",
        name: "Skin fade",
        mins: 50,
        price: 28,
        priceLabel: gbp(28),
        desc: "Clean blend, crisp edges.",
        details: "Clean blend, crisp edges. Includes line-up + tidy finish.",
        badge: "Most popular",
      },
      {
        key: "haircut_beard",
        category: "cuts",
        name: "Haircut + beard",
        mins: 60,
        price: 30,
        priceLabel: gbp(30),
        desc: "Full refresh, balanced shape.",
        details: "Haircut + beard tidy. Balanced shape, clean neckline.",
        badge: "Best value",
      },
      {
        key: "childrens_haircut",
        category: "cuts",
        name: "Children’s haircut",
        mins: 35,
        price: 17,
        priceLabel: gbp(17),
        desc: "Quick, calm, clean.",
        details: "Gentle cut with a tidy finish. No stress.",
      },
      {
        key: "hair_wash_style",
        category: "cuts",
        name: "Hair wash + style",
        mins: 10,
        price: 8,
        priceLabel: gbp(8),
        desc: "Fresh wash, styled finish.",
        details: "Wash + quick style to finish your look.",
      },
      {
        key: "hair_treatments",
        category: "cuts",
        name: "Hair treatments",
        mins: 15,
        price: 12,
        priceLabel: "£7–£15",
        desc: "Scalp + hair boost.",
        details: "Treatment varies by hair type. Final price confirmed in shop.",
      },
    ],
  },

  {
    key: "beard_shave",
    label: "BEARD & SHAVE",
    blurb: "Tidy shape. Hot towel finish.",
    img: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1400&q=80",
    services: [
      {
        key: "beard_care_shape",
        category: "beard_shave",
        name: "Beard care (shape)",
        mins: 15,
        price: 7,
        priceLabel: gbp(7),
        desc: "Neckline + quick tidy.",
        details: "Quick shape-up: neckline + cheek line tidy.",
      },
      {
        key: "beard_trim",
        category: "beard_shave",
        name: "Beard trim",
        mins: 20,
        price: 14,
        priceLabel: gbp(14),
        desc: "Balanced length, clean lines.",
        details: "Trim + tidy cheek lines + clean neckline.",
      },
      {
        key: "beard_sculpt_lineup",
        category: "beard_shave",
        name: "Beard sculpt + line-up",
        mins: 25,
        price: 16,
        priceLabel: gbp(16),
        desc: "Sharper edges, sculpted shape.",
        details: "Detailed sculpt + crisp line-up + symmetry work.",
      },
      {
        key: "beard_colouring",
        category: "beard_shave",
        name: "Beard colouring",
        mins: 30,
        price: 15,
        priceLabel: gbp(15),
        desc: "Tone + blend, natural look.",
        details: "Colour blend for a natural finish. Final shade confirmed in shop.",
      },
      {
        key: "shaving_regular",
        category: "beard_shave",
        name: "Shaving (regular)",
        mins: 20,
        price: 12,
        priceLabel: gbp(12),
        desc: "Smooth shave, simple finish.",
        details: "Regular shave with a clean finish. Sensitive-skin friendly.",
      },
      {
        key: "hot_towel_shave",
        category: "beard_shave",
        name: "Hot towel shave",
        mins: 30,
        price: 18,
        priceLabel: gbp(18),
        desc: "Warm towel, close finish.",
        details: "Warm towel + close shave. Clean and comfortable.",
      },
    ],
  },

  {
    key: "extras",
    label: "EXTRAS",
    blurb: "Small details. Big upgrade.",
    img: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80",
    services: [
      {
        key: "eyebrows",
        category: "extras",
        name: "Eyebrows",
        mins: 10,
        price: 6,
        priceLabel: gbp(6),
        desc: "Clean shape, natural.",
        details: "Quick tidy + shape. Natural finish.",
      },
      {
        key: "nose_wax",
        category: "extras",
        name: "Nose wax",
        mins: 10,
        price: 8,
        priceLabel: gbp(8),
        desc: "Fast, clean, done.",
        details: "Quick wax. Clean and hygienic.",
      },
      {
        key: "face_cleanse",
        category: "extras",
        name: "Face cleanse",
        mins: 15,
        price: 10,
        priceLabel: gbp(10),
        desc: "Fresh face reset.",
        details: "Cleanse + refresh. Great after a cut.",
      },
      {
        key: "black_mask",
        category: "extras",
        name: "Black mask",
        mins: 20,
        price: 12,
        priceLabel: gbp(12),
        desc: "Deep clean feel.",
        details: "Mask + clean-up. Leaves skin feeling fresh.",
      },
      {
        key: "steam_towel_finish",
        category: "extras",
        name: "Steam towel finish",
        mins: 10,
        price: 8,
        priceLabel: gbp(8),
        desc: "Warm finish, premium touch.",
        details: "Steam towel finish to complete your service.",
      },
      {
        key: "head_massage",
        category: "extras",
        name: "Head massage",
        mins: 15,
        price: 10,
        priceLabel: gbp(10),
        desc: "Relax, reset, recharge.",
        details: "Short head massage. Great add-on.",
      },
      {
        key: "scalp_detox",
        category: "extras",
        name: "Scalp detox",
        mins: 25,
        price: 16,
        priceLabel: gbp(16),
        desc: "Scalp refresh + comfort.",
        details: "Detox treatment for scalp comfort and freshness.",
      },
    ],
  },
];

export const BOOKING_SERVICES: BookingService[] = SERVICE_CATEGORIES.flatMap((c) => c.services);
