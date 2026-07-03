"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

const WAIVER_TEXT = `
Nackte LLC Waiver

The undersigned hereby waive, release and forever discharge Nackte LLC, its affiliates, managers, members, owners, agents, attorneys, employees, staff, volunteers, heirs, executors, administrators, representatives, predecessors, successors, and any person who personally owns property where Nackte LLC is operating from any claims resulting from physical or personal injury, pain, suffering, illness, disfigurement, temporary or permanent disability, loss or death, and any property damage that may occur or be caused by fire, theft, vandalism, water or land-related accidents, falls, snakes, insects, animals, uneven terrain, ditches, construction, tree stumps, natural events, pool mishaps, or any other occurrences or mishaps.

I understand that I have been given permission to enter the premises and use the premises for “camping”, “hiking”, “game participation”, swimming in the pool, using the pool, using the hot tub, using the jacuzzi, using the hot tub, fire pit, “recreational activities”, and all other related activities, or spectating. I recognize and understand that many of said activities can be dangerous in nature and can cause significant injury to person or property. I further recognize and understand that, due to the terrain, falls, snake or spider encounters, tree stumps, ditches, uneven terrain, or insect encounters, contact with nature may occur and may result in serious injury. As the undersigned I am here of my own free will, and entirely at my own risk. I understand that injuries or outcomes may arise by my own or others’ negligence or conditions on the premises or the conditions or use of amenities offered at the premises or related to travel to and from the premises.

I understand there is no supervision for the pool, showers, hot tub, jacuzzi, and any buildings that are on the grounds where Nackte LLC is operating. I understand that adults may be in a state of undress in Camp Nackte and I, the undersigned, come to this camp with the knowledge that adult activities may happen, and I do not find these activities obscene. Nonetheless, I, the undersigned, assume all related risks, both known and unknown. Neither Nackte LLC nor the owner/s of the property where Nackte LLC is operating are responsible for errors, omissions, acts or failures to act by any party or entity conducting a specific event or activity.

I agree to use the pool and jacuzzi in the prescribed manor. I agree to enter and exit the pool and Jacuzzi in the correct manner, using the steps, and if possible using the handrail. I agree to release Nackte LLC from any and all liability if I am injured in any way, shape, or form in the pool or Jacuzzi.

I agree to use the fire pit in the prescribed manner, I agree that Nackte LLC is doing everything reasonable to protect me from injury when enjoying the fire pit. I agree to release Nackte LLC from any and all injuries I may acquire using the fire pit.


If a membership is purchased, I agree that this waiver is effective for no less than 1 year from the date and time that I sign below.

I fully understand that this is a release of liability and I agree to voluntarily give up or waive any right that I otherwise have to bring legal action against Nackte LLC or the owners of the property where Nackte LLC is operating, for any personal injury or property damage whatsoever, including negligence on the part of Nackte LLC, its agents, and employees, and/or property owners. This waiver and release of liability shall remain in effect for the duration of my presence at the premises and in perpetuity after i leave the property. I further agree to indemnify, defend, pay all legal fees, and financially reimburse Nackte LLC and/or the owners of the property where Nackte LLC is operating, for any damages that might be awarded to myself or my legal representation as a result of anything that could possibly happen while i'm in a location where Nackte LLC is operating. I will hold harmless Nackte LLC and the property owner/s where Camp Nackte is operating, against any and all claims, suits or actions of any kind whatsoever for liability, damages, compensation or otherwise brought by me or anyone on my behalf, including attorney’s fees and any related costs.

I expressly agree this release is intended to be as broad and inclusive as permitted by the laws of the State of Texas and that, if any portion of this agreement is held to be invalid, it is agreed that the balance shall, notwithstanding, continue in full force and effect. This release contains the entire agreement between the parties and this agreement, and the terms of this release are contractual and not mere recitals. This release will be construed in accordance with the laws of the State of Texas.

I will not take pictures unless every person in the picture has verbally agreed to be in the frame, regardless of whether it's the foreground or background. The pool area is the only area of Camp Nackte where phones/cameras are allowed. I fully understand that I may inadvertently be in the background of someone's photo. I will not hold Nackte LLC or the owners of the property where Nackte LLC is operating responsible in any way for any damages that may occur as the result of me being in the background of someone's picture.

No one under 18 years of age may enter the grounds where Nackte LLC is operating. NO EXCEPTIONS!

I understand and agree that Nackte LLC owns any and all photos taken on property.  I agree that i will forever delete and make unrecoverable any photos not approved by Nackte LLC.  I also agree to delete and make unrecoverable any photo not approved by every person that may be in the forground or background of a photo.

I understand that Camp Nackte is not responsible for the weather. There will be no weather related refunds.

I agree to release Nackte LLC and the owner of any property where Nackte LLC is operating from any and all liability related to any and all consequences of using contractors, self employed professionals, or other businesses who may be operating at the locations where Nackte LLC is also operating.     

I understand that Nackte is a LGBTQIA+ safe space and agree to be respectful and accepting regardless of sex, sexual orientation, gender identity, race, religion, language, or country of origin.

I agree to never bring any illegal substances into the campground.

I agree that if I have a pet, the pet will be on a leash at all times and under my control.

Camp Nackte is clothing optional IN DESIGNATED AREAS ONLY.

I am not feeling sick in any way shape or form. If I am experiencing any of the following symptoms I will stay home. If I begin feeling any of the following symptoms while visiting Camp Nackte, I will leave, get tested for Covid, and notify campground personnel of any positive results. Please see list below for common symptoms of Covid 19.

Fever
Cough
Chills
Headache
Shortness of breath
Fatigue
Body Aches
Sore Throat
New Loss of Taste or Smell

I hereby grant Nackte LLC permission to use my likeness in a photograph, video, or other digital media ("photo") in any and all of it's publications, including web-based publications, without payment or other consideration. I understand and agree that any and all photos will become the property of Nackte LLC and will not be returned. I hereby irrevocably authorize Nackte LLC to edit, alter, copy, exhibit, public, or distribute these photos for any lawful purpose. In addition, I waive any right to inspect or approve the finished product wherein my likeness appears. Additionally, I waive any right to royalties or other compensation arising or related to the use of the photo. I hereby hold harmless, release, and forever discharge Nackte LLC from all claims, demands, and causes of action which I, my heirs, representatives, executors, administrators, or any other persons acting on my behalf or on behalf of my estate have or may by reason of this authorization.  This clause is required only if you are part of a promotional photoshoot at Camp Nackte.  
`;

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
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm uppercase tracking-[0.4em] text-slate-400">
          Camp Nackte
        </p>

        <h1 className="mt-4 text-4xl font-bold">Nackte LLC Waiver</h1>

        <p className="mt-4 text-slate-300">
          Please read the waiver carefully, complete the required fields, and
          sign below.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {WAIVER_TEXT}
            </pre>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-300">Full Name *</span>
            <input
              name="fullName"
              required
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Email</span>
              <input
                name="email"
                type="email"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-300">Phone</span>
              <input
                name="phone"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              />
            </label>
          </div>

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

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="mb-3 text-sm font-medium text-slate-300">
              Signature *
            </p>

            <div className="overflow-hidden rounded-xl bg-white">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "h-48 w-full",
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
          </div>

          <label className="flex gap-3 text-sm text-slate-300">
            <input type="checkbox" required className="mt-1" />
            <span>
              I have read, understand, and agree to the Nackte LLC waiver.
            </span>
          </label>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-500"
          >
            Submit Waiver
          </button>

          {message && <p className="text-sm text-slate-300">{message}</p>}
        </form>
      </section>
    </main>
  );
}

