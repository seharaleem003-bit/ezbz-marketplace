export interface ListingFormDefaults {
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  condition: string;
  status: string;
  price: string;
  retailPrice: string;
  amazonPrice: string;
  amazonUrl: string;
  metaTitle: string;
  metaDescription: string;
  searchKeywords: string;
  weightLb: string;
  lengthIn: string;
  widthIn: string;
  heightIn: string;
  inventoryQty: string;
  photoUrls: string;
  videoUrl: string;
  videoCaption: string;
  fundraiserId: string;
  fulfillmentPickup: boolean;
  fulfillmentDelivery: boolean;
  isPrebook: boolean;
}

export const EMPTY_LISTING_FORM_DEFAULTS: ListingFormDefaults = {
  title: "",
  slug: "",
  description: "",
  categoryId: "",
  condition: "GOOD",
  status: "DRAFT",
  price: "",
  retailPrice: "",
  amazonPrice: "",
  amazonUrl: "",
  metaTitle: "",
  metaDescription: "",
  searchKeywords: "",
  weightLb: "",
  lengthIn: "",
  widthIn: "",
  heightIn: "",
  inventoryQty: "1",
  photoUrls: "",
  videoUrl: "",
  videoCaption: "",
  fundraiserId: "",
  fulfillmentPickup: false,
  fulfillmentDelivery: true,
  isPrebook: false,
};
