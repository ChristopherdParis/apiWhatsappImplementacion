import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import type {
  MediaMessageDto,
  SendMediaMessageByTypeDto,
  SendTemplateMessageDto,
  SendTextMessageDto,
  WhatsappMessageType,
} from './dto/send-whatsapp-message.dto';
import type { ForwardIncomingWhatsappPayloadDto } from './dto/incoming-forward.dto';
import type {
  IncomingWhatsappContactSummary,
  IncomingWhatsappErrorSummary,
  IncomingWhatsappEventSummary,
  IncomingWhatsappMessageSummary,
  IncomingWhatsappStatusSummary,
} from './dto/webhook-message.dto';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly httpService: HttpService) {}

  verifyWebhook(
    mode: unknown,
    token: unknown,
    challenge: unknown,
  ): string | undefined {
    const verificationToken =
      process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN;

    if (!mode || !token) {
      throw new BadRequestException('Missing webhook verification parameters');
    }

    if (mode === 'subscribe' && token === verificationToken) {
      return challenge?.toString();
    }

    throw new BadRequestException('Invalid webhook verification token');
  }

  async handleIncomingWebhook(payload: any) {
    const normalizedPayload = this.normalizeIncomingPayload(payload);

    if (normalizedPayload.events.length === 0) {
      return {
        received: false,
        messages: [],
        statuses: [],
        contacts: [],
        errors: [],
        events: [],
      };
    }

    this.logger.log(
      `Incoming WhatsApp events: ${normalizedPayload.events.length}`,
    );
    this.logger.debug(JSON.stringify(normalizedPayload));

    const forwarded = await this.forwardIncomingEvents(payload, normalizedPayload);

    return {
      received: true,
      forwarded,
      ...normalizedPayload,
    };
  }

  async sendTextMessage(payload: SendTextMessageDto) {
    this.ensureRecipient(payload.to);

    if (!payload.body?.trim()) {
      throw new BadRequestException('The text message body is required');
    }

    return this.sendWhatsappRequest({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
      type: 'text',
      text: {
        preview_url: payload.previewUrl ?? false,
        body: payload.body,
      },
    });
  }

  async sendMediaMessage(payload: SendMediaMessageByTypeDto) {
    this.ensureSupportedMediaType(payload.type);
    this.ensureRecipient(payload.to);
    this.ensureMediaSource(payload);

    const mediaPayload: Record<string, string | undefined | boolean> = {
      link: payload.link,
      id: payload.id,
    };

    if (
      payload.type === 'image' ||
      payload.type === 'video' ||
      payload.type === 'document'
    ) {
      mediaPayload.caption = payload.caption;
    }

    if (payload.type === 'document') {
      mediaPayload.filename = payload.filename;
    }

    return this.sendWhatsappRequest({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
      type: payload.type,
      [payload.type]: mediaPayload,
    });
  }

  async sendTemplateMessage(payload: SendTemplateMessageDto) {
    this.ensureRecipient(payload.to);

    if (!payload.name?.trim()) {
      throw new BadRequestException('The template name is required');
    }

    if (!payload.languageCode?.trim()) {
      throw new BadRequestException('The template languageCode is required');
    }

    return this.sendWhatsappRequest({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
      type: 'template',
      template: {
        name: payload.name,
        language: {
          code: payload.languageCode,
        },
        components: payload.components ?? [],
      },
    });
  }

  private normalizeIncomingPayload(
    payload: any,
  ): Omit<ForwardIncomingWhatsappPayloadDto, 'object' | 'entry' | 'metadata'> {
    const changes = Array.isArray(payload?.entry)
      ? payload.entry.flatMap((entry: any) => entry?.changes ?? [])
      : [];

    const messages = changes.flatMap((change: any) =>
      Array.isArray(change?.value?.messages)
        ? change.value.messages.map((message: any) =>
            this.normalizeIncomingMessage(message),
          )
        : [],
    );

    const statuses = changes.flatMap((change: any) =>
      Array.isArray(change?.value?.statuses)
        ? change.value.statuses.map((status: any) =>
            this.normalizeIncomingStatus(status),
          )
        : [],
    );

    const contacts = changes.flatMap((change: any) =>
      Array.isArray(change?.value?.contacts)
        ? change.value.contacts.map((contact: any) =>
            this.normalizeIncomingContact(contact),
          )
        : [],
    );

    const errors = changes.flatMap((change: any) =>
      Array.isArray(change?.value?.errors)
        ? change.value.errors.map((error: any) =>
            this.normalizeIncomingError(error),
          )
        : [],
    );

    const events: IncomingWhatsappEventSummary[] = [
      ...messages.map((payload) => ({ eventType: 'message' as const, payload })),
      ...statuses.map((payload) => ({ eventType: 'status' as const, payload })),
      ...contacts.map((payload) => ({ eventType: 'contact' as const, payload })),
      ...errors.map((payload) => ({ eventType: 'error' as const, payload })),
    ];

    return {
      messages,
      statuses,
      contacts,
      errors,
      events,
    };
  }

  private normalizeIncomingMessage(message: any): IncomingWhatsappMessageSummary {
    const summary: IncomingWhatsappMessageSummary = {
      id: message?.id,
      from: message?.from,
      timestamp: message?.timestamp,
      type: message?.type ?? 'unknown',
      raw: message,
    };

    switch (message?.type) {
      case 'text':
        summary.text = {
          body: message?.text?.body,
        };
        break;
      case 'image':
        summary.image = {
          id: message?.image?.id,
          mimeType: message?.image?.mime_type,
          sha256: message?.image?.sha256,
          caption: message?.image?.caption,
        };
        break;
      case 'audio':
        summary.audio = {
          id: message?.audio?.id,
          mimeType: message?.audio?.mime_type,
          sha256: message?.audio?.sha256,
          voice: message?.audio?.voice,
        };
        break;
      case 'video':
        summary.video = {
          id: message?.video?.id,
          mimeType: message?.video?.mime_type,
          sha256: message?.video?.sha256,
          caption: message?.video?.caption,
        };
        break;
      case 'document':
        summary.document = {
          id: message?.document?.id,
          mimeType: message?.document?.mime_type,
          sha256: message?.document?.sha256,
          filename: message?.document?.filename,
          caption: message?.document?.caption,
        };
        break;
      case 'sticker':
        summary.sticker = {
          id: message?.sticker?.id,
          mimeType: message?.sticker?.mime_type,
          sha256: message?.sticker?.sha256,
          animated: message?.sticker?.animated,
        };
        break;
      default:
        this.logger.warn(`Unsupported incoming message type: ${message?.type}`);
        break;
    }

    return summary;
  }

  private normalizeIncomingStatus(status: any): IncomingWhatsappStatusSummary {
    return {
      id: status?.id,
      recipientId: status?.recipient_id,
      status: status?.status,
      timestamp: status?.timestamp,
      conversation: status?.conversation
        ? {
            id: status.conversation?.id,
            expirationTimestamp: status.conversation?.expiration_timestamp,
            originType: status.conversation?.origin?.type,
          }
        : undefined,
      pricing: status?.pricing
        ? {
            billable: status.pricing?.billable,
            category: status.pricing?.category,
            pricingModel: status.pricing?.pricing_model,
          }
        : undefined,
      errors: status?.errors,
      raw: status,
    };
  }

  private normalizeIncomingContact(contact: any): IncomingWhatsappContactSummary {
    return {
      waId: contact?.wa_id,
      profile: {
        name: contact?.profile?.name,
      },
      raw: contact,
    };
  }

  private normalizeIncomingError(error: any): IncomingWhatsappErrorSummary {
    return {
      code: error?.code,
      title: error?.title,
      message: error?.message,
      details: error?.error_data?.details,
      raw: error,
    };
  }

  private async forwardIncomingEvents(
    originalPayload: any,
    normalizedPayload: Omit<
      ForwardIncomingWhatsappPayloadDto,
      'object' | 'entry' | 'metadata'
    >,
  ) {
    const forwardUrl = process.env.WHATSAPP_INCOMING_FORWARD_URL;

    if (!forwardUrl?.trim()) {
      throw new BadRequestException(
        'WHATSAPP_INCOMING_FORWARD_URL is not configured',
      );
    }

    const body: ForwardIncomingWhatsappPayloadDto = {
      object: originalPayload?.object,
      entry: originalPayload?.entry,
      metadata: originalPayload?.entry?.[0]?.changes?.[0]?.value?.metadata,
      ...normalizedPayload,
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(forwardUrl, body, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      return {
        url: forwardUrl,
        statusCode: response.status,
        response: response.data,
      };
    } catch (error: any) {
      this.logger.error(
        JSON.stringify(error?.response?.data ?? error?.message ?? error),
      );
      throw new BadRequestException('Error forwarding incoming WhatsApp event');
    }
  }

  private async sendWhatsappRequest(payload: Record<string, unknown>) {
    const version = process.env.WHATSAPP_CLOUD_API_VERSION;
    const phoneNumberId = process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER;
    const accessToken = process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN;

    if (!version || !phoneNumberId || !accessToken) {
      throw new BadRequestException(
        'WhatsApp Cloud API environment variables are not fully configured',
      );
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        JSON.stringify(error?.response?.data ?? error?.message ?? error),
      );
      throw new BadRequestException('Error posting to WhatsApp Cloud API');
    }
  }

  private ensureRecipient(to?: string) {
    if (!to?.trim()) {
      throw new BadRequestException('The recipient phone number is required');
    }
  }

  private ensureMediaSource(payload: MediaMessageDto) {
    if (!payload.id && !payload.link) {
      throw new BadRequestException('Provide a media id or link');
    }
  }

  private ensureSupportedMediaType(type: WhatsappMessageType) {
    const supportedMediaTypes = [
      'image',
      'audio',
      'video',
      'document',
      'sticker',
    ];

    if (!supportedMediaTypes.includes(type)) {
      throw new BadRequestException(`Unsupported media message type: ${type}`);
    }
  }
}
