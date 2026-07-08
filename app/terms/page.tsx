import { LegalPageLayout } from "@/components/layout/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      version="1.0"
      lastUpdated="July 8, 2026"
    >
      <section>
        <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
        <p className="mt-2">
          These Terms of Service govern your use of ParadeOne. By accessing or using ParadeOne, you agree to these
          terms on behalf of yourself and, where applicable, your organization.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Account Responsibilities</h2>
        <p className="mt-2">
          You are responsible for keeping account credentials secure and for activity performed through your account.
          You must provide accurate account information and promptly update it if it changes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. Organizer Responsibilities</h2>
        <p className="mt-2">
          Organizers are responsible for event data accuracy, participant communications, and lawful operation of
          events managed through ParadeOne. Organizers must obtain any required permissions and consents for
          participant contact and messaging.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. Appropriate Use</h2>
        <p className="mt-2">
          You agree to use ParadeOne only for legitimate operational purposes. You must not misuse the service,
          attempt unauthorized access, interfere with platform operations, or use ParadeOne to send unlawful,
          misleading, or abusive communications.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Service Availability</h2>
        <p className="mt-2">
          ParadeOne works to provide reliable service, but availability is not guaranteed. Maintenance, vendor outages,
          connectivity issues, and other factors may affect access, timing, and delivery of communications.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. Liability Limits</h2>
        <p className="mt-2">
          ParadeOne is provided on an as-is and as-available basis to the maximum extent permitted by law. ParadeOne
          and its operators are not liable for indirect, incidental, special, consequential, or punitive damages,
          or for lost profits, data, or goodwill arising from use of the service.
        </p>
        <p className="mt-2">
          To the extent permitted by law, total liability for claims related to ParadeOne is limited to amounts paid,
          if any, for use of the service during the period applicable to the claim.
        </p>
      </section>
    </LegalPageLayout>
  );
}
