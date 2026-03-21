export type WhatsappMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'template';

export interface BaseSendWhatsappMessageDto {
  to: string;
}

export interface SendTextMessageDto extends BaseSendWhatsappMessageDto {
  body: string;
  previewUrl?: boolean;
}

export interface MediaMessageDto extends BaseSendWhatsappMessageDto {
  link?: string;
  id?: string;
  caption?: string;
  filename?: string;
}

export interface TemplateComponentParameterDto {
  type: 'text';
  text: string;
}

export interface TemplateComponentDto {
  type: 'body';
  parameters: TemplateComponentParameterDto[];
}

export interface SendTemplateMessageDto extends BaseSendWhatsappMessageDto {
  name: string;
  languageCode: string;
  components?: TemplateComponentDto[];
}

export interface SendMediaMessageByTypeDto extends MediaMessageDto {
  type: Exclude<WhatsappMessageType, 'text' | 'template'>;
}
