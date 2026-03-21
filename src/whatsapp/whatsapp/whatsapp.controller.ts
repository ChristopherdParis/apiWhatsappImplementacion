import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { WhatsappService } from './whatsapp.service';
import type {
  SendMediaMessageByTypeDto,
  SendTemplateMessageDto,
  SendTextMessageDto,
} from './dto/send-whatsapp-message.dto';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('webhook')
  whatsappVerificationChallenge(@Req() request: Request) {
    return this.whatsappService.verifyWebhook(
      request.query['hub.mode'],
      request.query['hub.verify_token'],
      request.query['hub.challenge'],
    );
  }

  @Post('webhook')
  @HttpCode(200)
  async handleIncomingWhatsappMessage(@Body() request: any) {
    return this.whatsappService.handleIncomingWebhook(request);
  }

  @Post('messages/text')
  async sendTextMessage(@Body() payload: SendTextMessageDto) {
    return this.whatsappService.sendTextMessage(payload);
  }

  @Post('messages/media')
  async sendMediaMessage(@Body() payload: SendMediaMessageByTypeDto) {
    return this.whatsappService.sendMediaMessage(payload);
  }

  @Post('messages/template')
  async sendTemplateMessage(@Body() payload: SendTemplateMessageDto) {
    return this.whatsappService.sendTemplateMessage(payload);
  }
}
