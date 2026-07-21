# Twilio operational SMS setup

ParadeOne uses Twilio for two-way, event-scoped operational messaging. Mission Control remains the system of record: outbound messages, inbound replies, consent changes, and delivery results are stored against the active parade.

## 1. Apply the database migration

Apply `database/migrations/022_twilio_delivery_tracking.sql` to the Supabase project used by the deployment. Do this before operators attempt to send SMS messages.

## 2. Configure Vercel environment variables

Add these server-only values to the Vercel project:

```dotenv
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_PHONE=+1...
TWILIO_WEBHOOK_BASE_URL=https://paradeone.com
NEXT_PUBLIC_APP_URL=https://paradeone.com
```

If a Twilio Messaging Service is used, set `TWILIO_MESSAGING_SERVICE_SID=MG...` and omit `TWILIO_FROM_PHONE`. Never expose the account SID's Auth Token through a `NEXT_PUBLIC_` variable.

Redeploy after changing environment variables.

## 3. Configure the inbound webhook

For the ParadeOne Twilio number or Messaging Service, set the incoming-message webhook to:

```text
POST https://paradeone.com/api/sms/inbound
```

ParadeOne validates every inbound request using `X-Twilio-Signature`. `TWILIO_WEBHOOK_BASE_URL` must exactly match the public scheme and hostname configured in Twilio or valid webhooks will be rejected.

## 4. Delivery callbacks

ParadeOne adds its delivery callback URL automatically when it creates an outbound message:

```text
POST https://paradeone.com/api/sms/status
```

Twilio appends a ParadeOne delivery identifier to that URL. Delivery state is displayed in Mission Control as sending, delivered, partial, or failed.

## 5. Consent behavior

- Only registration entries with recorded SMS consent receive parade-unit messages.
- Volunteer and section-captain directory records must be explicitly marked opted in.
- `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, and `QUIT` disable further ParadeOne SMS messages.
- `START`, `UNSTOP`, and `YES` restore consent.
- `HELP` returns operational support guidance.
- Unknown phone numbers are not attached to an event or conversation.

## 6. End-to-end verification

1. Register a test entry with a real mobile number and accept SMS consent.
2. Open that parade from `/parades`, then confirm its name appears as the active parade in Mission Control.
3. Select the test unit in Communications and send a direct SMS.
4. Confirm the delivery state changes from `sending` to `delivered`.
5. Reply from the phone and confirm the reply appears in Mission Control within a few seconds.
6. Reply `STOP`, verify the consent state changes, and confirm another outbound attempt finds no eligible recipient.
7. Reply `START`, send again, and confirm delivery resumes.
8. Push off the test unit and confirm the automated clearance SMS uses the same tracked delivery flow.
