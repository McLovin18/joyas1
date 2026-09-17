const STANDARD_WIDTH_CM = 150;
const STANDARD_HEIGHT_CM = 100;
const MEASURE_STEP_CM = 10;
const STANDARD_BASE_PRICE = 250;
const MIN_MEASURE_CM = 30;
const MIN_ADJUSTED_PRICE = 80;

type ParsedMeasure = {
  widthCm: number;
  heightCm: number;
};

export type MeasurePricingResult = {
  isValid: boolean;
  error: string | null;
  rawWidthCm: number | null;
  rawHeightCm: number | null;
  roundedWidthCm: number | null;
  roundedHeightCm: number | null;
  adjustedPrice: number | null;
  widthStepPrice: number;
  heightStepPrice: number;
  widthDeltaSteps: number;
  heightDeltaSteps: number;
};

function normalizeMeasureNumber(value: string): number {
  return Number(String(value).replace(",", ".").trim());
}

function parseMeasureInput(value: string): ParsedMeasure | null {
  const trimmed = String(value || "").trim().toLowerCase();
  if (!trimmed) return null;

  const match = trimmed.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?$/
  );

  if (!match) return null;

  const widthCm = normalizeMeasureNumber(match[1]);
  const heightCm = normalizeMeasureNumber(match[2]);

  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    return null;
  }

  return { widthCm, heightCm };
}

function roundMeasureByStandard(value: number, standard: number): number {
  const rounded =
    value >= standard
      ? Math.ceil(value / MEASURE_STEP_CM) * MEASURE_STEP_CM
      : Math.floor(value / MEASURE_STEP_CM) * MEASURE_STEP_CM;

  return Math.max(MEASURE_STEP_CM, rounded);
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getMeasurePricing(basePrice: number, inputValue: string): MeasurePricingResult {
  const requestedBasePrice = Number(basePrice);
  const safeBasePrice =
    Number.isFinite(requestedBasePrice) && requestedBasePrice > 0
      ? requestedBasePrice
      : STANDARD_BASE_PRICE;
  const widthStepPrice = safeBasePrice / (STANDARD_WIDTH_CM / MEASURE_STEP_CM);
  const heightStepPrice = safeBasePrice / (STANDARD_HEIGHT_CM / MEASURE_STEP_CM);
  const parsedMeasure = parseMeasureInput(inputValue);

  if (!String(inputValue || "").trim()) {
    return {
      isValid: false,
      error: null,
      rawWidthCm: null,
      rawHeightCm: null,
      roundedWidthCm: null,
      roundedHeightCm: null,
      adjustedPrice: null,
      widthStepPrice,
      heightStepPrice,
      widthDeltaSteps: 0,
      heightDeltaSteps: 0,
    };
  }

  if (!parsedMeasure) {
    return {
      isValid: false,
      error: "Escribe la medida en formato ancho x alto, por ejemplo 150x100 cm.",
      rawWidthCm: null,
      rawHeightCm: null,
      roundedWidthCm: null,
      roundedHeightCm: null,
      adjustedPrice: null,
      widthStepPrice,
      heightStepPrice,
      widthDeltaSteps: 0,
      heightDeltaSteps: 0,
    };
  }

  if (parsedMeasure.widthCm < MIN_MEASURE_CM || parsedMeasure.heightCm < MIN_MEASURE_CM) {
    return {
      isValid: false,
      error: `La medida mínima permitida es ${MIN_MEASURE_CM}x${MIN_MEASURE_CM} cm.`,
      rawWidthCm: parsedMeasure.widthCm,
      rawHeightCm: parsedMeasure.heightCm,
      roundedWidthCm: null,
      roundedHeightCm: null,
      adjustedPrice: null,
      widthStepPrice,
      heightStepPrice,
      widthDeltaSteps: 0,
      heightDeltaSteps: 0,
    };
  }

  const roundedWidthCm = roundMeasureByStandard(parsedMeasure.widthCm, STANDARD_WIDTH_CM);
  const roundedHeightCm = roundMeasureByStandard(parsedMeasure.heightCm, STANDARD_HEIGHT_CM);
  const widthDeltaSteps = (roundedWidthCm - STANDARD_WIDTH_CM) / MEASURE_STEP_CM;
  const heightDeltaSteps = (roundedHeightCm - STANDARD_HEIGHT_CM) / MEASURE_STEP_CM;
  const calculatedPrice = roundPrice(
    safeBasePrice + widthDeltaSteps * widthStepPrice + heightDeltaSteps * heightStepPrice
  );
  const adjustedPrice = Math.max(0, calculatedPrice);

  if (adjustedPrice < MIN_ADJUSTED_PRICE) {
    return {
      isValid: false,
      error: `La medida seleccionada genera un precio menor a $${MIN_ADJUSTED_PRICE}.`,
      rawWidthCm: parsedMeasure.widthCm,
      rawHeightCm: parsedMeasure.heightCm,
      roundedWidthCm,
      roundedHeightCm,
      adjustedPrice,
      widthStepPrice,
      heightStepPrice,
      widthDeltaSteps,
      heightDeltaSteps,
    };
  }

  return {
    isValid: true,
    error: null,
    rawWidthCm: parsedMeasure.widthCm,
    rawHeightCm: parsedMeasure.heightCm,
    roundedWidthCm,
    roundedHeightCm,
    adjustedPrice,
    widthStepPrice,
    heightStepPrice,
    widthDeltaSteps,
    heightDeltaSteps,
  };
}

export function formatRoundedMeasure(result: MeasurePricingResult): string {
  if (!result.roundedWidthCm || !result.roundedHeightCm) return "";
  return `${result.roundedWidthCm}x${result.roundedHeightCm} cm`;
}
