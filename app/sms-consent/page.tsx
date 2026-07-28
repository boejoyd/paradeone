import Link from "next/link";

import { LegalPageLayout } from "@/components/layout/LegalPageLayout";

const PARADEONE_SMS_NUMBER = "+1 (830) 355-6970";

export default function SmsConsentPage() {
  return (
    <LegalPageLayout
      title="ParadeOne SMS Consent"
      version="1.0"
      lastUpdated="July 28, 2026"
    >
      <section>
        <h2 className="text-xl font-semibold">ParadeOne Operational Messaging Program</h2>
        <p className="mt-2">
          ParadeOne is a parade registration and live-operations platform. Parade participants may voluntarily
          subscribe to operational text messages about the specific parade for which they register. Messages can
          include staging instructions, lineup changes, check-in information, push-off timing, safety notices, and
          other time-sensitive event coordination.
        </p>
        <p className="mt-2">
          Messages originate from <strong>{PARADEONE_SMS_NUMBER}</strong>. ParadeOne does not use this program for
          promotional marketing.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">How Participants Opt In</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-6">
          <li>A participant opens the public registration form for a ParadeOne-managed parade.</li>
          <li>The participant enters a mobile phone number.</li>
          <li>
            The participant independently selects the optional, unchecked SMS-consent checkbox shown below. The
            participant can submit the parade registration without selecting it.
          </li>
          <li>ParadeOne records consent for that entry and that parade before sending operational messages.</li>
        </ol>
      </section>

      <section className="rounded-xl border border-slate-600 bg-slate-950/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Consent presented on the registration form
        </p>
        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            disabled
            aria-label="Example optional ParadeOne SMS consent checkbox"
            className="mt-1 h-4 w-4"
          />
          <span>
            I agree to receive recurring operational text messages from ParadeOne about this parade, including
            staging, lineup, push-off, and safety updates. Message frequency varies. Message and data rates may
            apply. Reply STOP to opt out or HELP for help. Consent is not a condition of registration. See the{" "}
            <Link href="/sms-terms" className="underline underline-offset-2">ParadeOne SMS Terms</Link> and{" "}
            <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
          </span>
        </label>
        <p className="mt-4 text-xs text-slate-400">
          This disabled example documents the wording and default unchecked state used on live parade registration
          forms. It does not collect a phone number or create an SMS subscription.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Opt Out and Customer Care</h2>
        <p className="mt-2">
          Reply <strong>STOP</strong> at any time to unsubscribe. Reply <strong>HELP</strong> for assistance.
          Participants may also text HELP to <strong>{PARADEONE_SMS_NUMBER}</strong>. Message frequency varies, and
          message and data rates may apply.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Consent and Privacy</h2>
        <p className="mt-2">
          SMS consent is optional, applies only to the ParadeOne operational messaging program, and is not a
          condition of registering for or participating in a parade. Mobile information and text messaging
          opt-in data and consent will not be shared with third parties or affiliates for marketing or promotional
          purposes.
        </p>
        <p className="mt-2">
          Review the <Link href="/sms-terms" className="underline underline-offset-2">SMS Terms</Link>,{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy Policy</Link>, and{" "}
          <Link href="/terms" className="underline underline-offset-2">Terms of Service</Link>.
        </p>
      </section>
    </LegalPageLayout>
  );
}
