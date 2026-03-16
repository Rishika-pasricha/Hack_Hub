export const colors = {
  background: "#f6f1ea",
  surface: "#ffffff",
  primary: "#0f6d59",
  primaryDark: "#0a4d3d",
  primaryLight: "#1a9870",
  text: "#1c1b1a",
  textSecondary: "#6b6560",
  muted: "#6b6560",
  error: "#b42318",
  errorLight: "#e8a4a0",
  border: "#e7dfd6",
  success: "#0b7d3b",
  successLight: "#a8ddb5",
  warning: "#d97706",
  info: "#0284c7"
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
};

export const typography = {
  title: 28,
  subtitle: 18,
  body: 16,
  label: 14,
  small: 12,
  sizes: {
    xxxl: 32,
    xxl: 28,
    xl: 24,
    lg: 18,
    md: 16,
    sm: 14,
    xs: 12
  },
  weights: {
    light: "300",
    regular: "400",
    semibold: "600",
    bold: "700"
  }
};

// Animation timings (in milliseconds)
export const animations = {
  fast: 150,
  normal: 250,
  slow: 350,
  verySlow: 500
};

// Shadows/Elevations (using React Native shadow properties)
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12
  }
};

// Gradients (color pairs for gradient components - actually rendered in components)
export const gradients = {
  primary: [colors.primary, colors.primaryDark],
  success: [colors.success, colors.primaryDark],
  error: [colors.error, "#8b1a0f"],
  subtle: [colors.background, colors.surface]
};
