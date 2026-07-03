"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

const WAIVER_TEXT = `Before your visit, please review and sign the waiver below. This helps us keep the check-in process quick and ensures everyone understands the campground policies.

# Camp Nackte Waiver, Assumption of Risk, and Release of Liability

## Assumption of Risk
I voluntarily choose to enter Camp Nackte and participate in camping, hiking, swimming, use of the pool, hot tub, jacuzzi, fire pit, recreational activities, social activities, spectating, and all other activities available on the property.
I understand that these activities involve inherent risks that cannot be completely eliminated and may result in serious personal injury, illness, permanent disability, death, emotional distress, or damage to personal property.
These risks include, but are not limited to:
* Falls
* Uneven terrain
* Tree roots, stumps, rocks, ditches, and natural obstacles
* Wildlife, snakes, spiders, insects, and other animals
* Fire and burns
* Water-related accidents
* Weather conditions
* Construction areas
* Theft or vandalism
* Equipment failure
* The acts or negligence of myself or other guests
* Any other known or unknown hazards associated with outdoor recreation.
I knowingly and voluntarily assume all risks, whether known or unknown.

## Release of Liability
In consideration for being permitted to enter Camp Nackte, I release and forever discharge Nackte LLC, its members, managers, owners, employees, volunteers, agents, affiliates, successors, assigns, representatives, and the owners of any property where Camp Nackte operates from any claims, demands, causes of action, damages, losses, or liabilities arising out of or related to my presence on the property or participation in any activity, including claims arising from the ordinary negligence of Nackte LLC or its representatives, to the fullest extent permitted by Texas law.
This release includes claims involving bodily injury, illness, disability, death, emotional distress, and loss or damage to personal property.
This release does not waive liability for conduct that cannot legally be waived under applicable law.

## Indemnification
I agree to indemnify and hold harmless Nackte LLC and the property owners from claims, damages, liabilities, or expenses arising from my own actions, negligence, or violation of campground rules, including reasonable attorney's fees where permitted by law.

## Camp Facilities
I understand that the pool, hot tub, jacuzzi, showers, fire pit, and other recreational amenities are unsupervised.
I agree to use all facilities safely, follow posted rules, use designated entrances and exits, and exercise reasonable care while using any campground amenity.
I assume all risks associated with using these facilities.

## Nature of the Campground
I understand that Camp Nackte is an LGBTQIA+ safe space dedicated to providing a respectful, welcoming environment for all guests regardless of race, religion, language, country of origin, sex, sexual orientation, or gender identity.
I understand that Camp Nackte is clothing optional only in designated areas and that adults may be nude. I acknowledge this before entering the property and understand that lawful adult nudity may be visible during my visit.
## Photography Policy
Photography and video recording are permitted only in designated areas and only with the verbal consent of every identifiable person appearing in the image, including anyone in the background.
If Camp Nackte determines that any photograph violates this policy, I agree to permanently delete all copies of that photograph.
I understand that despite these policies, I may inadvertently appear in the background of another guest's approved photograph. I release Camp Nackte from liability arising solely from such incidental appearances.
If I voluntarily participate in an official Camp Nackte promotional photo or video session, I grant Camp Nackte permission to use my likeness in photographs, videos, and other media for lawful promotional purposes without compensation. I waive any right to inspect or approve the finished materials and understand that no royalties or additional compensation will be paid.

## Camp Rules
I agree that:
* No person under eighteen (18) years of age may enter the property.
* I will not possess or use illegal drugs on the property.
* Pets must remain leashed and under my control at all times.
* I will follow all posted campground rules and staff instructions.
* Camp Nackte is clothing optional only in designated areas.
* Weather conditions do not qualify for refunds.

## Vendors and Independent Contractors
I understand that vendors, entertainers, instructors, contractors, and other independent businesses may occasionally operate on the property.
I acknowledge that these parties are responsible for their own services, and I release Camp Nackte from liability arising solely from the acts or omissions of independent third parties that are not under Camp Nackte's control.

## Health
I certify that I am not knowingly experiencing symptoms of a contagious illness that would place other guests at unreasonable risk.
If I become ill during my visit, I agree to leave the campground promptly and notify management if appropriate.

## Membership
If I purchase a membership, this agreement shall remain effective for one (1) year from the date it is signed unless replaced by a newer agreement.

## General Provisions
This agreement shall be governed by the laws of the State of Texas.
If any provision of this agreement is found unenforceable, the remaining provisions shall remain in full force and effect.
This document constitutes the entire agreement regarding assumption of risk and release of liability between the parties.
By signing below, I certify that I have carefully read this agreement, understand its contents, understand that I am giving up certain legal rights, including the right to bring certain claims against Nackte LLC, and voluntarily agree to all of its terms.


I understand this is a legally binding agreement and that I have had the opportunity to ask questions before signing.`;

function WaiverTextBlock() {
  return (
    <article className="rounded-3xl bg-white p-6 text-slate-950 shadow-2xl md:p-10">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold tracking-tight">
          Nackte LLC Waiver
        </h2>

        <p className="mt-3 border-b border-slate-200 pb-6 text-base text-slate-600">
          Please read this waiver carefully before signing.
        </p>

        <div className="mt-8 whitespace-pre-wrap text-[17px] leading-9 text-slate-800">
          {WAIVER_TEXT}
        </div>
      </div>
    </article>
  );
}

export function CampNackteWaiverForm() {
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const [message, setMessage] = useState("");

  function clearSignature() {
    signatureRef.current?.clear();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const visitDate = String(formData.get("visitDate") || "");

    if (!fullName || !visitDate || (!email && !phone)) {
      setMessage("Please enter your name, visit date, and either email or phone.");
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setMessage("Please sign inside the signature box.");
      return;
    }

    const signatureDataUrl = signatureRef.current.toDataURL("image/png");

    const response = await fetch("/camp-nackte/waiver/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName,
        email,
        phone,
        visitDate,
        waiverText: WAIVER_TEXT,
        signatureDataUrl,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      setMessage(errorBody?.error || "Something went wrong saving the waiver.");
      return;
    }

    setMessage("Waiver submitted successfully. Thank you.");
    form.reset();
    clearSignature();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-8 md:py-12">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
            Camp Nackte
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Welcome to Camp Nackte
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            Before your visit, please review and sign the waiver below. This
            helps us keep check-in quick and ensures everyone understands the
            campground policies.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-8">
          <WaiverTextBlock />

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
            <h2 className="text-2xl font-bold">Guest Information</h2>

            <div className="mt-6 grid gap-6">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Full Name *
                </span>
                <input
                  name="fullName"
                  required
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-300">
                    Email
                  </span>
                  <input
                    name="email"
                    type="email"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-300">
                    Phone
                  </span>
                  <input
                    name="phone"
                    className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                  />
                </label>
              </div>

              <p className="text-sm text-slate-400">
                Please provide at least one: email or phone.
              </p>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-300">
                  Date Visiting Camp *
                </span>
                <input
                  name="visitDate"
                  type="date"
                  required
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
            <h2 className="text-2xl font-bold">Signature</h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              By signing below, I confirm that I have read, understand, and
              agree to the Nackte LLC waiver.
            </p>

            <div className="mt-5 overflow-hidden rounded-xl bg-white">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "h-52 w-full",
                }}
              />
            </div>

            <button
              type="button"
              onClick={clearSignature}
              className="mt-3 text-sm font-medium text-slate-300 hover:text-white"
            >
              Clear signature
            </button>

            <label className="mt-6 flex gap-3 text-sm text-slate-300">
              <input type="checkbox" required className="mt-1" />
              <span>
                I have read, understand, and agree to the Nackte LLC waiver.
              </span>
            </label>
          </section>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-500"
          >
            Submit Waiver
          </button>

          {message && (
            <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
              {message}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
