import { LegalPageLayout } from "@/components/layout/LegalPageLayout";
import Link from "next/link";

export default function SmsTermsPage() {
  return (
    <LegalPageLayout
      title="SMS Terms"
      version="1.1"
      lastUpdated="July 28, 2026"
    >
      <section>
        <h2 className="text-xl font-semibold">1. SMS Program Description</h2>
        <p className="mt-2">
          ParadeOne uses SMS for operational event communication, including staging instructions, check-in updates,
          timing changes, and mission-control coordination.
        </p>
        <p className="mt-2">Messages originate from +1 (830) 355-6970.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Consent and Use</h2>
        <p className="mt-2">
          Participants opt in by entering a mobile phone number on a public parade-registration form and voluntarily
          selecting the separate, optional SMS-consent checkbox. The checkbox is unchecked by default, and SMS consent
          is not required to submit a registration or participate in a parade.
        </p>
        <p className="mt-2">ParadeOne does not send promotional marketing campaigns through this operational SMS program.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Opt-Out and Help</h2>
        <p className="mt-2">Reply STOP at any time to opt out of SMS messages. Reply HELP for support information.</p>
        <p className="mt-2">
          Even after opting out, you may receive limited non-promotional messages required to confirm your opt-out
          status or fulfill legal obligations.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. Message Frequency and Fees</h2>
        <p className="mt-2">
          Message frequency varies by event activity and your role. Message and data rates may apply according to your
          mobile carrier plan.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Carrier Disclaimer</h2>
        <p className="mt-2">
          Carriers are not liable for delayed or undelivered messages.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. Related Policies</h2>
        <p className="mt-2">
          Review our <Link className="underline decoration-slate-500 underline-offset-2" href="/privacy">Privacy Policy</Link>{" "}
          and <Link className="underline decoration-slate-500 underline-offset-2" href="/terms">Terms of Service</Link> for
          additional information.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">7. Contact</h2>
        <p className="mt-2">
          For SMS support, reply HELP or text HELP to +1 (830) 355-6970. Participants may also contact their parade
          organizer for event-specific assistance.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">8. Consent Verification</h2>
        <p className="mt-2">
          Review the public <Link className="underline decoration-slate-500 underline-offset-2" href="/sms-consent">
            SMS Consent page
          </Link> for the complete opt-in workflow and the exact disclosure presented during registration.
        </p>
      </section>
    </LegalPageLayout>
  );
}
