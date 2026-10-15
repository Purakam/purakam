export const SERVICE_ICON_MAP = {
  // Database seed keys
  zap: 'lightning-bolt',
  plug: 'power-plug',
  wind: 'air-conditioner',
  activity: 'battery-charging',
  droplet: 'water-boiler',

  // Category name fallbacks
  electrician: 'lightning-bolt',
  plumber: 'pipe-wrench',
  carpenter: 'hammer',
  carpentry: 'hammer',
  cleaning: 'broom',
  switchboard: 'toggle-switch-outline',
  wiring: 'power-plug',
  ac: 'air-conditioner',
  appliance: 'washing-machine',
  inverter: 'battery-charging',
  battery: 'battery-charging',
  geyser: 'water-boiler',
  heater: 'water-boiler',
};

export const getServiceIcon = (iconKey) => {
  if (!iconKey) return 'wrench';
  const key = iconKey.toLowerCase().trim();
  
  // Direct match
  if (SERVICE_ICON_MAP[key]) return SERVICE_ICON_MAP[key];
  
  // Keyword fuzzy matching
  if (key.includes('electric') || key.includes('zap')) return 'lightning-bolt';
  if (key.includes('switchboard') || key.includes('wiring') || key.includes('plug')) return 'toggle-switch-outline';
  if (key.includes('ac ') || key.includes('appliance') || key.includes('wind')) return 'air-conditioner';
  if (key.includes('inverter') || key.includes('battery') || key.includes('activity')) return 'battery-charging';
  if (key.includes('geyser') || key.includes('heater') || key.includes('droplet')) return 'water-boiler';
  if (key.includes('plumb')) return 'pipe-wrench';
  if (key.includes('carpent')) return 'hammer';
  if (key.includes('clean')) return 'broom';
  
  return 'wrench';
};
