export interface FamilyMember {
  id: number;
  name: string;
  created_at: string;
}

export interface Place {
  id: number;
  name: string;
  address: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface GoogleMapsAutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface GoogleMapsPlaceDetails {
  name: string;
  formatted_address: string;
  address_components: {
    long_name: string;
    short_name: string;
    types: string[];
  }[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface FoodRating {
  id: number;
  food_name: string;
  rating: number;
  notes: string | null;
  family_member_id: number;
  family_member_name: string;
  place_id: number | null;
  place_name: string | null;
  created_at: string;
}
