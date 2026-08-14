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
  inventoryQty: "0",
  photoUrls: "",
  videoUrl: "",
  videoCaption: "",
  fundraiserId: "",
  fulfillmentPickup: false,
  fulfillmentDelivery: true,
  isPrebook: false,
};
