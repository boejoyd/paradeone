export const CAMP_NACKTE_WAIVER_VERSION = "2026-01";

export const CAMP_NACKTE_WAIVER_TEXT = `Before your visit, please review and sign the waiver below. This helps us keep the check-in process quick and ensures everyone understands the campground policies.

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

## Annual Validity
This waiver becomes effective at the exact date and time I sign it and remains valid until the exact anniversary of that date and time one calendar year later, unless it is revoked or superseded earlier. It expires at that exact anniversary timestamp. After expiration, I must sign a new waiver before entering, remaining on, or using the property or its facilities again.

## General Provisions
This agreement shall be governed by the laws of the State of Texas.
If any provision of this agreement is found unenforceable, the remaining provisions shall remain in full force and effect.
This document constitutes the entire agreement regarding assumption of risk and release of liability between the parties.
By signing below, I certify that I have carefully read this agreement, understand its contents, understand that I am giving up certain legal rights, including the right to bring certain claims against Nackte LLC, and voluntarily agree to all of its terms.

I understand this is a legally binding agreement and that I have had the opportunity to ask questions before signing.`;

export function addCalendarYear(value: Date) {
  const result = new Date(value.getTime());
  const month = result.getUTCMonth();
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCFullYear(result.getUTCFullYear() + 1);
  result.setUTCMonth(month + 1, 0);
  const lastDayOfTargetMonth = result.getUTCDate();
  result.setUTCMonth(month, Math.min(day, lastDayOfTargetMonth));
  return result;
}

export function normalizeCampPhone(value: string) {
  const digits = value.trim().replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function maskEmail(value: string | null) {
  if (!value) return null;
  const [name, domain] = value.split("@");
  return `${name.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(5, name.length - 1)))}@${domain}`;
}

export function maskPhone(value: string | null) {
  if (!value) return null;
  const digits = normalizeCampPhone(value);
  return digits.length >= 4 ? `•••-•••-${digits.slice(-4)}` : "••••";
}
