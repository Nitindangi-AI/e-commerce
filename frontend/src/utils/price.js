export const formatPrice = (paise) => {
  if (paise === null || paise === undefined) return "₹0.00";
  return `₹${(paise / 100).toFixed(2)}`;
};
