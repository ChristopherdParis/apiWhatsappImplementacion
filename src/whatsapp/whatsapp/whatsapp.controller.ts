import { HttpService } from '@nestjs/axios';
import { BadRequestException, Body, Controller, Get, HttpCode, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { catchError, firstValueFrom, lastValueFrom, map } from 'rxjs';

@Controller('whatsapp')
export class WhatsappController {
    constructor(private httpService: HttpService) { }
    private readonly logger = new Logger(WhatsappController.name);
    @Get('webhook')
    whatsappVerificationChallenge(@Req() request: Request) {
        const mode = request.query['hub.mode'];
        const challenge = request.query['hub.challenge'];
        const token = request.query['hub.verify_token'];
        const verificationToken =
            process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN;
        if (!mode || !token) {
            return 'Error verifying token';
        }

        if (mode === 'subscribe' && token === verificationToken) {
            return challenge?.toString();
        }
    }
    @Post('webhook')
    @HttpCode(200)
    async handleIncomingWhatsappMessage(@Body() request: any) {
        this.logger.log("recibido ");
        this.logger.log(`${ JSON.stringify(request)}`);
        const { messages } = request?.entry?.[0]?.changes?.[0].value ?? {};
        this.logger.log(`recibido: ${ messages}`);
        if (!messages) return;
        const message = messages[0];
        const messageSender = message.from;
        const messageID = message.id;
        switch (message.type) {
            case 'text':
                const text = message.text.body;
                this.logger.debug(text);
                const url = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_API_VERSION}/${process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER}/messages`;
                let config = {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`
                    }
                };
                const data = JSON.stringify({
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": messageSender,
                    "type": "text",
                    "text": {
                        "preview_url": false,
                        "body": "Response Message From Our Bot CTR"
                    }
                });
                // this.logger.debug("antes de enviar", url);
                // this.logger.debug("antes de enviar", config);
                // this.logger.debug("antes de enviar", data);
                try {
                const response = await firstValueFrom(
                    this.httpService.post(url, data, config).pipe(
                    map((res) => {
                        this.logger.verbose(JSON.stringify(res.data));
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error(error?.response?.data || error.message || error);
                        throw new BadRequestException('Error Posting To WhatsApp Cloud API');
                    }),
                    ),
                );

                return response;
                } catch (error) {
                this.logger.error(error);
                throw error;
                }
                // try {
                //     const response = this.httpService
                //         .post(url, data, config)
                //         .pipe(
                //             map((res) => {
                //                 this.logger.verbose(res.data);
                //                 return res.data;
                //             })
                //         )
                //         .pipe(
                //             catchError((error) => {
                //                 this.logger.error(error);
                //                 throw new BadRequestException(
                //                     'Error Posting To WhatsaApp Cloud API',
                //                 );
                //             }),
                //         );
                // } catch (error) {
                //     this.logger.error(error);
                //     return 'Chris broke!! Abort mission!!';
                // }
                // const messageSendingStatus = await lastValueFrom(response);
                break;

            default:
                break;
        }
    }
}

