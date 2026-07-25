# Twilio SMS production setup

ParadeOne uses Twilio for operational, consent-based SMS. The application sends
push-off alerts and optional Mission Control channel messages, records inbound
replies, honors STOP/START/HELP, and tracks delivery callbacks.

## 1. Apply the database migration

Apply `database/migrations/025_twilio_sms_delivery_tracking.sql` to the target
Supabase database before deploying the code that uses it.

## 2. Configure production environment variables

Set these server-only variables in Vercel for the Production environment:

```dotenv
SUPABASE_SERVICE_ROLE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WEBHOOK_BASE_URL=https://www.paradeone.com
```

Choose one Twilio sender configuration:

```dotenv
# Recommended: a Messaging Service containing the approved sender
TWILIO_MESSAGING_SERVICE_SID=

# Or: a single Twilio number in E.164 format
TWILIO_FROM_PHONE=+12105551212
```

`TWILIO_WEBHOOK_BASE_URL` must exactly match the public origin configured in
Twilio, including whether the hostname uses `www`.

Never expose the auth token or Supabase service-role key through a
`NEXT_PUBLIC_` variable.

## 3. Configure the inbound webhook

For the Twilio phone number or Messaging Service, configure incoming messages
to send an HTTP `POST` to:

```text
https://www.paradeone.com/api/sms/inbound
```

If a Messaging Service is used, enable Advanced Opt-Out so Twilio includes
`OptOutType` for STOP, START, and HELP messages. ParadeOne also recognizes the
standard keywords when that field is absent.

The application supplies this status callback on every outgoing message, so no
separate console setting is required:

```text
https://www.paradeone.com/api/sms/status
```

## 4. Prepare the sender

Complete the Twilio sender registration or verification required for the chosen
number type and destination country. A Twilio trial account may only deliver to
verified recipients.

## 5. Production smoke test

Use a test registration and a mobile number you control:

1. Register for an open parade and select the SMS consent checkbox.
2. In Mission Control, send a short message with **Also send to opted-in
   contacts by SMS** selected.
3. Confirm the phone receives the message.
4. Reply with a normal message and confirm it appears in the Parade Units
   Mission Control channel.
5. Reply `STOP`, then confirm a later Mission Control message is not sent to
   that number.
6. Reply `START`, send another message, and confirm delivery resumes.
7. Push off the test unit and confirm the push-off action succeeds even if SMS
   delivery is deliberately made to fail.

## Operational behavior

- Parade state updates are never rolled back when Twilio fails.
- Only explicitly opted-in recipients are selected for outbound messages.
- A local opt-out is retained even if the entry originally opted in.
- Twilio webhook signatures and account IDs are validated before data is read
  or changed.
- Duplicate inbound callbacks are ignored using the Twilio message SID.
- Out-of-order delivery callbacks cannot overwrite a later delivery state.
