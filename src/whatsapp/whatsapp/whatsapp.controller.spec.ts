import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappController', () => {
  let controller: WhatsappController;
  const whatsappServiceMock = {
    verifyWebhook: jest.fn(),
    handleIncomingWebhook: jest.fn(),
    sendTextMessage: jest.fn(),
    sendMediaMessage: jest.fn(),
    sendTemplateMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        {
          provide: WhatsappService,
          useValue: whatsappServiceMock,
        },
      ],
    }).compile();

    controller = module.get<WhatsappController>(WhatsappController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates text sending to the service', async () => {
    whatsappServiceMock.sendTextMessage.mockResolvedValue({ ok: true });

    await expect(
      controller.sendTextMessage({
        to: '51999999999',
        body: 'hola',
      }),
    ).resolves.toEqual({ ok: true });

    expect(whatsappServiceMock.sendTextMessage).toHaveBeenCalledWith({
      to: '51999999999',
      body: 'hola',
    });
  });
});
