import type {
  IncomingWhatsappContactSummary,
  IncomingWhatsappErrorSummary,
  IncomingWhatsappEventSummary,
  IncomingWhatsappMessageSummary,
  IncomingWhatsappStatusSummary,
} from './webhook-message.dto';

export interface ForwardIncomingWhatsappPayloadDto {
  object?: string;
  entry?: any[];
  metadata?: Record<string, unknown>;
  messages: IncomingWhatsappMessageSummary[];
  statuses: IncomingWhatsappStatusSummary[];
  contacts: IncomingWhatsappContactSummary[];
  errors: IncomingWhatsappErrorSummary[];
  events: IncomingWhatsappEventSummary[];
}

export interface ForwardIncomingWhatsappResultDto {
  url: string;
  statusCode: number;
  response: unknown;
}

export interface HandleIncomingWebhookResultDto {
  received: boolean;
  forwarded?: ForwardIncomingWhatsappResultDto;
  messages: IncomingWhatsappMessageSummary[];
  statuses: IncomingWhatsappStatusSummary[];
  contacts: IncomingWhatsappContactSummary[];
  errors: IncomingWhatsappErrorSummary[];
  events: IncomingWhatsappEventSummary[];
}
