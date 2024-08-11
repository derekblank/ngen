export const updateBackgroundColor = (x) => {
  const pastelColors = [
    "#b0e0e6",
    "#add8e6",
    "#87cefa",
    "#b0c4de",
    "#afeeee",
    "#e0ffff",
  ];
  const colorIndex = x * (pastelColors.length - 1);
  const lowerIndex = Math.floor(colorIndex);
  const upperIndex = Math.ceil(colorIndex);
  const blend = colorIndex - lowerIndex;

  const color1 = hexToRgb(pastelColors[lowerIndex]);
  const color2 = hexToRgb(pastelColors[upperIndex]);
  const blendedColor = {
    r: Math.round(color1.r * (1 - blend) + color2.r * blend),
    g: Math.round(color1.g * (1 - blend) + color2.g * blend),
    b: Math.round(color1.b * (1 - blend) + color2.b * blend),
  };

  return `rgb(${blendedColor.r}, ${blendedColor.g}, ${blendedColor.b})`;
};

export const hexToRgb = (hex) => {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};
