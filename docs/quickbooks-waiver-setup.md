# QuickBooks → Camp Nackte waiver setup

This integration treats QuickBooks Online as the source of truth for paid day
passes and ParadeOne as the source of truth for guests and annual waivers.

## Production configuration

1. Apply `database/migrations/026_quickbooks_waiver_integration.sql` in Supabase.
2. In the Intuit developer app, enable the QuickBooks Online Accounting scope.
3. Register this production redirect URI:
   `https://www.paradeone.com/api/quickbooks/callback`
4. Register this production webhook:
   `https://www.paradeone.com/api/quickbooks/webhook`
5. Subscribe the webhook to SalesReceipt and RefundReceipt create, update,
   delete, and void events.
6. Copy the production webhook verifier token into
   `QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN`.
7. Set the production client ID, client secret, redirect URI, and a long random
   `QUICKBOOKS_TOKEN_ENCRYPTION_KEY` in Vercel.
8. In QuickBooks, get the Product/Service IDs used for Camp Nackte day passes
   and place the comma-separated IDs in `QUICKBOOKS_DAY_PASS_ITEM_IDS`.
9. Configure `RESEND_API_KEY`, `CAMP_NACKTE_WAIVER_FROM_EMAIL`, and
   `NEXT_PUBLIC_APP_URL` so purchasers without a current waiver receive the
   secure confirmation-code link.
10. Sign in to ParadeOne as an administrator, open Settings, and select
   **Connect QuickBooks**.

## Functional behavior

- Intuit webhook signatures are checked before an event is accepted.
- Events have deterministic keys, so webhook retries do not duplicate passes.
- Events are stored before processing and failures remain visible in the
  `quickbooks_webhook_events` queue for recovery.
- Only configured day-pass products create purchases.
- Guest matching prefers QuickBooks customer ID, then normalized email and
  phone. Conflicting candidates are marked ambiguous and left for staff.
- Each purchased admission creates one attendee slot. The purchaser is linked
  to the first slot when identity matching is unambiguous.
- Voided sales receipts deactivate the purchase. Linked refund receipts mark
  it refunded.
- OAuth tokens are encrypted at rest and refreshed server-side. The latest
  rotated refresh token replaces the old one.

## Smoke test

1. Create a one-unit day-pass sales receipt for a test customer.
2. Confirm one `day_pass_purchases` row and one `day_pass_attendees` row appear.
3. Open `/camp-nackte/waiver/submissions` and confirm the purchase is counted.
4. Complete the test guest waiver and confirm the attendee is no longer counted
   as missing a current waiver.
5. Void the sales receipt and confirm its purchase status becomes `voided`.

Never paste Intuit client secrets, verifier tokens, OAuth tokens, or encryption
keys into chat, source control, screenshots, or browser-visible environment
variables.
