export interface IncomingWhatsappMessageSummary {
  id: string;
  from: string;
  timestamp?: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    id?: string;
    mimeType?: string;
    sha256?: string;
    caption?: string;
  };
  audio?: {
    id?: string;
    mimeType?: string;
    sha256?: string;
    voice?: boolean;
  };
  video?: {
    id?: string;
    mimeType?: string;
    sha256?: string;
    caption?: string;
  };
  document?: {
    id?: string;
    mimeType?: string;
    sha256?: string;
    filename?: string;
    caption?: string;
  };
  sticker?: {
    id?: string;
    mimeType?: string;
    sha256?: string;
    animated?: boolean;
  };
  raw?: Record<string, unknown>;
}

export interface IncomingWhatsappStatusSummary {
  id?: string;
  recipientId?: string;
  status?: string;
  timestamp?: string;
  conversation?: {
    id?: string;
    expirationTimestamp?: string;
    originType?: string;
  };
  pricing?: {
    billable?: boolean;
    category?: string;
    pricingModel?: string;
  };
  errors?: unknown[];
  raw?: Record<string, unknown>;
}

export interface IncomingWhatsappContactSummary {
  waId?: string;
  profile?: {
    name?: string;
  };
  raw?: Record<string, unknown>;
}

export interface IncomingWhatsappErrorSummary {
  code?: number | string;
  title?: string;
  message?: string;
  details?: string;
  raw?: Record<string, unknown>;
}

export interface IncomingWhatsappEventSummary {
  eventType: 'message' | 'status' | 'contact' | 'error';
  payload:
    | IncomingWhatsappMessageSummary
    | IncomingWhatsappStatusSummary
    | IncomingWhatsappContactSummary
    | IncomingWhatsappErrorSummary;
}
