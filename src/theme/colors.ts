export const Colors = {
  // Brand
  primary: '#1E88E5',       // Trucker blue
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',
  accent: '#F57C00',        // CB radio orange
  accentLight: '#FFB74D',

  // Backgrounds
  bg: '#0A1628',            // Deep navy - night driving friendly
  bgCard: '#13223A',
  bgInput: '#1A2E4A',

  // Status colors
  statusGreen: '#43A047',   // Driving / On duty
  statusAmber: '#F9A825',   // Break needed / Warning
  statusRed: '#E53935',     // HOS violation / Alert
  statusGray: '#546E7A',    // Off duty / Sleeper

  // Text
  textPrimary: '#ECEFF1',
  textSecondary: '#90A4AE',
  textMuted: '#546E7A',

  // UI
  border: '#1E3A5F',
  divider: '#162840',
  white: '#FFFFFF',
  black: '#000000',
};

export const HOSStatusColor: Record<string, string> = {
  off_duty: Colors.statusGray,
  sleeper_berth: Colors.statusGray,
  driving: Colors.statusGreen,
  on_duty: Colors.primary,
};