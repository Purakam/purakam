export const TIME_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '01:00 PM - 03:00 PM',
  '03:00 PM - 05:00 PM',
  '05:00 PM - 07:00 PM',
];

export const AREA_OPTIONS = [
  'Mumbai',
  'Mumbai Suburban',
  'Navi Mumbai',
  'Thane',
];


export const PLATFORM_FEE = 49;
export const GST_RATE = 0.18;

export const calculateBookingTotal = (basePrice) => {
  const base = parseFloat(basePrice) || 0;
  const gst = base * GST_RATE;
  return base + gst + PLATFORM_FEE;
};
