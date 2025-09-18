import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SalesRecord, ForecastingModel, ForecastResult } from '../types';
import { runForecastingModel } from '../services/forecastingService';
import { getForecastAnalysis } from '../services/geminiService';
import { ChartIcon, LightbulbIcon, TagIcon, MegaphoneIcon, ArchiveBoxIcon } from './icons/Icons';

interface ForecasterProps {
  salesData: SalesRecord[];
}

const InsightCard: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 bg-indigo-100 text-indigo-600 rounded-full h-8 w-8 flex items-center justify-center mt-1">
            {icon}
        </div>
        <div>
            <h5 className="font-semibold text-slate-700">{title}</h5>
            <p className="text-sm text-slate-600">{text}</p>
        </div>
    </div>
);

const Forecaster: React.FC<ForecasterProps> = ({ salesData }) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<ForecastingModel>(ForecastingModel.HOLT_WINTERS);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productNames = useMemo(() => {
    return [...new Set(salesData.map(d => d.productName))].sort();
  }, [salesData]);

  useEffect(() => {
    if (productNames.length > 0 && !selectedProduct) {
      setSelectedProduct(productNames[0]);
    }
  }, [productNames, selectedProduct]);

  const runAnalysis = useCallback(async () => {
    if (!selectedProduct) return;

    setIsLoading(true);
    setError(null);
    setForecastResult(null);

    const productData = salesData
      .filter(d => d.productName === selectedProduct)
      .sort((a, b) => a.month.localeCompare(b.month));
    
    const historicalUnits = productData.map(d => d.unitsSold);

    if (historicalUnits.length < 2) {
      setError("Not enough historical data to generate a forecast for this product.");
      setIsLoading(false);
      return;
    }
    
    try {
      const forecast = runForecastingModel(selectedModel, historicalUnits, 1);
      const demandForecast = Math.round(forecast[0]);

      const aiAnalysis = await getForecastAnalysis(selectedProduct, historicalUnits, demandForecast, selectedModel);
      
      setForecastResult({
        productName: selectedProduct,
        demandForecast: demandForecast,
        ...aiAnalysis,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      console.error("Forecasting error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProduct, selectedModel, salesData]);

  useEffect(() => {
    if (selectedProduct) {
      runAnalysis();
    }
  }, [selectedProduct, selectedModel, runAnalysis]);

  const chartData = useMemo(() => {
    const historicalData = salesData
      .filter(d => d.productName === selectedProduct)
      .sort((a, b) => a.month.localeCompare(b.month));
      
    const baseData = historicalData.map(d => ({ month: d.month, "Units Sold": d.unitsSold }));

    if (forecastResult) {
      const lastHistoricalPoint = baseData[baseData.length - 1];
      if (lastHistoricalPoint) {
        const [year, month] = lastHistoricalPoint.month.split('-').map(Number);
        const nextMonthDate = new Date(year, month, 1);
        const nextMonthString = `${nextMonthDate.getFullYear()}-${(nextMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const forecastSeries = [...baseData.map((_, index) => ({
            month: baseData[index].month,
            "Forecast": index === baseData.length - 1 ? baseData[index]["Units Sold"] : undefined,
        }))];

        forecastSeries.push({
            month: nextMonthString,
            "Forecast": forecastResult.demandForecast,
        });

        // FIX: The original push() failed because the forecast point lacks a 'Units Sold' property.
        // This combines historical and forecast data into a single array with a correct union type.
        const combinedData = forecastSeries.map((forecastPoint, index) => {
          if (index < baseData.length) {
            // Merge historical data with forecast data
            return { ...baseData[index], ...forecastPoint };
          }
          // Add the forecast-only point
          return forecastPoint;
        });
        
        return combinedData;
      }
    }

    return baseData;
  }, [salesData, selectedProduct, forecastResult]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-lg shadow-xl p-6 border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label htmlFor="product-select" className="block text-sm font-medium text-slate-700 mb-1">Select Product</label>
            <select
              id="product-select"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full text-white p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {productNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="model-select" className="block text-sm font-medium text-slate-700 mb-1">Forecasting Model</label>
            <select
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ForecastingModel)}
              className="w-full text-white p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.values(ForecastingModel).map(model => <option key={model} value={model}>{model}</option>)}
            </select>
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Units Sold" stroke="#4f46e5" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="Forecast" stroke="#16a34a" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-6 border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><ChartIcon className="h-6 w-6" /> Forecast Analysis</h3>
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        )}
        {error && <div className="text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
        {forecastResult && !isLoading && !error && (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-slate-500">Demand Forecast (Next Month)</p>
              <p className="text-4xl font-bold text-indigo-600">{forecastResult.demandForecast.toLocaleString()} units</p>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2 mb-4"><LightbulbIcon className="h-5 w-5" /> AI-Powered Insights</h4>
              <div className="space-y-4">
                <p className="text-sm text-slate-600 italic">"{forecastResult.reasoning}"</p>
                <InsightCard 
                    icon={<TagIcon className="h-5 w-5" />}
                    title="Pricing Strategy"
                    text={forecastResult.pricingStrategy}
                />
                <InsightCard 
                    icon={<MegaphoneIcon className="h-5 w-5" />}
                    title="Marketing Suggestion"
                    text={forecastResult.marketingSuggestion}
                />
                <InsightCard 
                    icon={<ArchiveBoxIcon className="h-5 w-5" />}
                    title="Inventory Suggestion"
                    text={forecastResult.inventorySuggestion}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forecaster;