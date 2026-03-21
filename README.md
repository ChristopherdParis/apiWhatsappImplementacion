# WhatsApp API implementation

API construida con NestJS para integrar WhatsApp Cloud API.

## Variables de entorno

Configura estas variables antes de usar los endpoints:

```env
WHATSAPP_CLOUD_API_VERSION=v22.0
WHATSAPP_CLOUD_API_PHONE_NUMBER=TU_PHONE_NUMBER_ID
WHATSAPP_CLOUD_API_ACCESS_TOKEN=TU_ACCESS_TOKEN
WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN=TU_VERIFY_TOKEN
WHATSAPP_INCOMING_FORWARD_URL=https://tu-sistema.com/api/whatsapp/incoming
```

## Registro de errores

Los errores se guardan en `logs/errors-YYYY-MM-DD.log` en formato JSON por linea.

El sistema:

- separa los logs por dia
- elimina automaticamente los archivos con mas de 3 dias de antiguedad
- conserva `logs/` fuera del repositorio por `.gitignore`

Se registran:

- excepciones HTTP/globales con metodo, ruta, query y body
- errores al reenviar eventos a `WHATSAPP_INCOMING_FORWARD_URL`
- errores al enviar mensajes a WhatsApp Cloud API

## Endpoints

### Verificar webhook

```http
GET /whatsapp/webhook
```

Meta enviara `hub.mode`, `hub.verify_token` y `hub.challenge`.

### Recibir eventos

```http
POST /whatsapp/webhook
```

Normaliza todos los eventos entrantes de WhatsApp y los reenvia al endpoint configurado en `WHATSAPP_INCOMING_FORWARD_URL`:

- `text`
- `image`
- `audio`
- `video`
- `document`
- `sticker`
- `statuses` como `sent`, `delivered`, `read`, `failed`
- `contacts`
- `errors`

Payload reenviado:

```json
{
  "object": "whatsapp_business_account",
  "entry": [],
  "metadata": {
    "display_phone_number": "111",
    "phone_number_id": "222"
  },
  "messages": [
    {
      "id": "wamid.1",
      "from": "51999999999",
      "timestamp": "1711000000",
      "type": "image",
      "image": {
        "id": "media-1",
        "mimeType": "image/jpeg",
        "sha256": "hash",
        "caption": "foto"
      }
    }
  ],
  "statuses": [
    {
      "id": "wamid.out.1",
      "recipientId": "51999999999",
      "status": "delivered",
      "timestamp": "1711000001"
    }
  ],
  "contacts": [
    {
      "waId": "51999999999",
      "profile": {
        "name": "Chris"
      }
    }
  ],
  "errors": [],
  "events": [
    {
      "eventType": "message",
      "payload": {}
    },
    {
      "eventType": "status",
      "payload": {}
    }
  ]
}
```

### Enviar texto

```http
POST /whatsapp/messages/text
Content-Type: application/json
```

```json
{
  "to": "51999999999",
  "body": "Hola desde NestJS",
  "previewUrl": false
}
```

### Enviar multimedia

```http
POST /whatsapp/messages/media
Content-Type: application/json
```

```json
{
  "to": "51999999999",
  "type": "image",
  "link": "https://example.com/photo.jpg",
  "caption": "Imagen de prueba"
}
```

Tipos soportados en `type`:

- `image`
- `audio`
- `video`
- `document`
- `sticker`

Para GIF en WhatsApp Cloud API, usa un MP4 corto con `type: "video"` o un sticker animado si tu flujo lo requiere.

### Enviar template

```http
POST /whatsapp/messages/template
Content-Type: application/json
```

```json
{
  "to": "51999999999",
  "name": "hello_world",
  "languageCode": "en_US",
  "components": [
    {
      "type": "body",
      "parameters": [
        {
          "type": "text",
          "text": "Christopher"
        }
      ]
    }
  ]
}
```
