export const VEHICLE_TYPE_OPTIONS = [
  { value: "walking_group", label: "Walking Group" },
  { value: "bicycle", label: "Bicycle" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "golf_cart", label: "Golf Cart" },
  { value: "car_suv", label: "Car / SUV" },
  { value: "pickup_truck", label: "Pickup Truck" },
  { value: "van", label: "Van" },
  { value: "bus", label: "Bus" },
  { value: "trailer", label: "Trailer" },
  { value: "float", label: "Float" },
  { value: "tractor", label: "Tractor" },
  { value: "emergency_vehicle", label: "Emergency Vehicle" },
  { value: "other", label: "Other" },
] as const;

export type VehicleType = (typeof VEHICLE_TYPE_OPTIONS)[number]["value"];

const vehicleTypes = new Set<string>(VEHICLE_TYPE_OPTIONS.map((option) => option.value));

export function parseVehicleType(value: FormDataEntryValue | null): VehicleType | null {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (!vehicleTypes.has(normalized)) throw new Error("Vehicle type is invalid.");
  return normalized as VehicleType;
}

export function formatVehicleType(value: string | null | undefined) {
  if (!value) return "Not set";
  return VEHICLE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Unknown";
}

