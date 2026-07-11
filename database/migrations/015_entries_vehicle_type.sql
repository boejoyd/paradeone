alter table entries
  add column vehicle_type text;

alter table entries
  add constraint entries_vehicle_type_check check (
    vehicle_type is null or vehicle_type in (
      'walking_group',
      'bicycle',
      'motorcycle',
      'golf_cart',
      'car_suv',
      'pickup_truck',
      'van',
      'bus',
      'trailer',
      'float',
      'tractor',
      'emergency_vehicle',
      'other'
    )
  );

