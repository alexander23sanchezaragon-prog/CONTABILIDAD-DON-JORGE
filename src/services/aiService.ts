import { Empresa } from '../types';

export const analyzeFinancialData = async (data: any) => {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error("AI Analysis API failed");
    }

    const result = await response.json();
    return result.analysis;
  } catch (error) {
    console.error("Error analyzing data:", error);
    throw new Error("No se pudo generar el análisis financiero.");
  }
};
