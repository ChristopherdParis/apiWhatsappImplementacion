import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { ErrorLogService } from '../../common/services/error-log.service';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService', () => {
  let service: WhatsappService;
  const httpServiceMock = {
    post: jest.fn(),
  };
  const errorLogServiceMock = {
    logException: jest.fn(),
    logOperationalError: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: HttpService,
          useValue: httpServiceMock,
        },
        {
          provide: ErrorLogService,
          useValue: errorLogServiceMock,
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('normalizes and forwards all whatsapp event types', async () => {
    process.env.WHATSAPP_INCOMING_FORWARD_URL = 'https://example.com/incoming';
    httpServiceMock.post.mockReturnValueOnce(
      of({
        status: 200,
        data: { ok: true },
      }),
    );

    const result = await service.handleIncomingWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                metadata: {
                  display_phone_number: '111',
                  phone_number_id: '222',
                },
                contacts: [
                  {
                    profile: {
                      name: 'Chris',
                    },
                    wa_id: '51999999999',
                  },
                ],
                messages: [
                  {
                    id: 'wamid.1',
                    from: '51999999999',
                    timestamp: '1711000000',
                    type: 'image',
                    image: {
                      id: 'media-1',
                      mime_type: 'image/jpeg',
                      sha256: 'hash',
                      caption: 'foto',
                    },
                  },
                ],
                statuses: [
                  {
                    id: 'wamid.out.1',
                    recipient_id: '51999999999',
                    status: 'delivered',
                    timestamp: '1711000001',
                    conversation: {
                      id: 'conversation-1',
                      expiration_timestamp: '1711003600',
                      origin: {
                        type: 'user_initiated',
                      },
                    },
                    pricing: {
                      billable: true,
                      category: 'service',
                      pricing_model: 'CBP',
                    },
                  },
                ],
                errors: [
                  {
                    code: 131000,
                    title: 'Sample error',
                    message: 'Details',
                    error_data: {
                      details: 'More details',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(result.received).toBe(true);
    expect(result.messages).toHaveLength(1);
    expect(result.statuses).toHaveLength(1);
    expect(result.contacts).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.events).toHaveLength(4);
    expect(result.forwarded).toEqual({
      url: 'https://example.com/incoming',
      statusCode: 200,
      response: { ok: true },
    });

    expect(httpServiceMock.post).toHaveBeenCalledWith(
      'https://example.com/incoming',
      expect.objectContaining({
        object: 'whatsapp_business_account',
        metadata: {
          display_phone_number: '111',
          phone_number_id: '222',
        },
        messages: expect.any(Array),
        statuses: expect.any(Array),
        contacts: expect.any(Array),
        errors: expect.any(Array),
        events: expect.any(Array),
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  });

  it('fails if the forward URL is not configured', async () => {
    delete process.env.WHATSAPP_INCOMING_FORWARD_URL;

    await expect(
      service.handleIncomingWebhook({
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: 'wamid.1',
                      from: '51999999999',
                      type: 'text',
                      text: {
                        body: 'hola',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forwards status-only webhooks', async () => {
    process.env.WHATSAPP_INCOMING_FORWARD_URL = 'https://example.com/incoming';
    httpServiceMock.post.mockReturnValueOnce(
      of({
        status: 202,
        data: { accepted: true },
      }),
    );

    const result = await service.handleIncomingWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: 'wamid.out.1',
                    recipient_id: '51999999999',
                    status: 'read',
                    timestamp: '1711000002',
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(result.received).toBe(true);
    expect(result.statuses).toHaveLength(1);
    expect(result.messages).toHaveLength(0);
    expect(result.forwarded).toEqual({
      url: 'https://example.com/incoming',
      statusCode: 202,
      response: { accepted: true },
    });
  });

  it('sends media messages to WhatsApp Cloud API', async () => {
    process.env.WHATSAPP_CLOUD_API_VERSION = 'v22.0';
    process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER = '123456789';
    process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN = 'token';
    httpServiceMock.post.mockReturnValue(
      of({
        data: { messages: [{ id: 'wamid.sent' }] },
      }),
    );

    const response = await service.sendMediaMessage({
      to: '51999999999',
      type: 'video',
      link: 'https://example.com/video.mp4',
      caption: 'demo',
    });

    expect(response).toEqual({ messages: [{ id: 'wamid.sent' }] });
    expect(httpServiceMock.post).toHaveBeenCalledWith(
      'https://graph.facebook.com/v22.0/123456789/messages',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '51999999999',
        type: 'video',
        video: {
          link: 'https://example.com/video.mp4',
          id: undefined,
          caption: 'demo',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token',
        },
      },
    );
  });

  it('rejects media messages without id or link', async () => {
    await expect(
      service.sendMediaMessage({
        to: '51999999999',
        type: 'image',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
