import type { ReportVehicle } from './types';

export const DEPRECIATION_RATE = 0.16;
export const FIRST_DEPRECIATION_YEAR = 2026;

export function parseCurrentVehicleValue(value?: string) {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,.-]/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    const commaDecimalDigits = cleaned.split(',').pop()?.length || 0;
    normalized = commaDecimalDigits === 3 ? cleaned.replace(/,/g, '') : cleaned.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function calculateYearDepreciation(vehicle: ReportVehicle, depreciationYear: number) {
  const baseValue = parseCurrentVehicleValue(vehicle.price);
  const selectedYear =
    Number.isFinite(depreciationYear) && depreciationYear >= FIRST_DEPRECIATION_YEAR
      ? depreciationYear
      : FIRST_DEPRECIATION_YEAR;
  const previousYears = Math.max(0, selectedYear - FIRST_DEPRECIATION_YEAR);
  const startValue = baseValue * Math.pow(1 - DEPRECIATION_RATE, previousYears);
  const depreciationAmount = startValue * DEPRECIATION_RATE;
  const endValue = startValue * (1 - DEPRECIATION_RATE);

  return {
    baseValue,
    firstDepreciationYear: FIRST_DEPRECIATION_YEAR,
    previousYears,
    startValue,
    depreciationAmount,
    endValue,
  };
}

export function findMatchingVehicle(vehicle: ReportVehicle, vehicles: ReportVehicle[]) {
  return (
    vehicles.find((candidate) => candidate.id && vehicle.id && candidate.id === vehicle.id) ||
    vehicles.find(
      (candidate) =>
        candidate.plate.trim().toLowerCase() === vehicle.plate.trim().toLowerCase()
    ) ||
    vehicle
  );
}

export function calculateVehicleDepreciationAmount(
  vehicle: ReportVehicle,
  vehicles: ReportVehicle[],
  depreciationYear: number
) {
  const matchedVehicle = findMatchingVehicle(vehicle, vehicles);
  return calculateYearDepreciation(matchedVehicle, depreciationYear).depreciationAmount;
}
