import { LegalPageLayout } from "@/components/layout/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      version="1.0"
      lastUpdated="July 8, 2026"
    >
      <section>
        <h2 className="text-xl font-semibold">1. Overview</h2>
        <p className="mt-2">
          ParadeOne helps parade organizers and participants coordinate staging, check-in, and operational communication.
          This Privacy Policy explains what information we collect, how we use it, and the choices you have.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">2. Information We Collect</h2>
        <p className="mt-2">
          We collect account and event information such as names, email addresses, organization details, entry data,
          and role assignments. We also collect communications data, including SMS and in-app operational messages,
          sender and recipient phone numbers, message content, and delivery-related metadata when available.
        </p>
        <p className="mt-2">
          When location-based tools are used, ParadeOne may process GPS or approximate location data associated with
          event operations, including live map and staging views.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">3. How We Use Information</h2>
        <p className="mt-2">
          We use information to provide and improve ParadeOne, support event logistics, send operational
          communications, keep records of mission-control activity, and maintain service security.
        </p>
        <p className="mt-2">
          SMS communications are used for operational purposes such as staging instructions, check-in updates,
          and time-sensitive event coordination.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">4. Data Sharing and No Sale of Phone Numbers</h2>
        <p className="mt-2">
          ParadeOne may share information with service providers that help us operate the platform, such as cloud,
          messaging, and analytics vendors, under contractual protections.
        </p>
        <p className="mt-2">
          We do not sell phone numbers. We do not share phone numbers with third parties for their independent
          marketing purposes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">5. Retention and Contact</h2>
        <p className="mt-2">
          We retain data for as long as needed to operate ParadeOne, meet legal obligations, resolve disputes,
          and enforce our agreements. Retention periods may vary by data type and event requirements.
        </p>
        <p className="mt-2">For privacy questions, contact your event organizer or ParadeOne support.</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">6. Policy Updates</h2>
        <p className="mt-2">
          We may update this Privacy Policy as ParadeOne evolves. The Last Updated date reflects the latest revision.
        </p>
      </section>
    </LegalPageLayout>
  );
}
