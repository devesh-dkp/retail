import { ForecastingModel } from '../types';

/**
 * Runs the selected forecasting model on the provided data.
 */
export function runForecastingModel(model: ForecastingModel, data: number[], periods: number = 1): number[] {
    switch (model) {
        case ForecastingModel.SES:
            return simpleExponentialSmoothing(data, periods);
        case ForecastingModel.HOLT:
            return holtsMethod(data, periods);
        case ForecastingModel.HOLT_WINTERS:
            // Holt-Winters requires at least two full seasons of data. A season is assumed to be 12 months.
            if (data.length < 24) {
                // Fallback to Holt's method if data is not seasonal enough
                console.warn("Holt-Winters requires at least 24 data points. Falling back to Holt's Method.");
                return holtsMethod(data, periods);
            }
            return holtWintersMethod(data, periods, 12);
        default:
            throw new Error(`Unknown forecasting model: ${model}`);
    }
}

/**
 * Simple Exponential Smoothing (SES) - good for data with no trend or seasonality.
 */
function simpleExponentialSmoothing(data: number[], periods: number, alpha: number = 0.3): number[] {
    if (data.length === 0) return new Array(periods).fill(0);
    const smoothed = [data[0]];
    for (let i = 1; i < data.length; i++) {
        smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
    }
    const lastSmoothedValue = smoothed[smoothed.length - 1];
    return new Array(periods).fill(lastSmoothedValue);
}

/**
 * Holt's Method (Double Exponential Smoothing) - good for data with a trend.
 */
function holtsMethod(data: number[], periods: number, alpha: number = 0.3, beta: number = 0.1): number[] {
    if (data.length < 2) return simpleExponentialSmoothing(data, periods);

    let level = data[0];
    let trend = data[1] - data[0];

    for (let i = 1; i < data.length; i++) {
        const lastLevel = level;
        level = alpha * data[i] + (1 - alpha) * (lastLevel + trend);
        trend = beta * (level - lastLevel) + (1 - beta) * trend;
    }

    const forecast = [];
    for (let i = 1; i <= periods; i++) {
        forecast.push(level + i * trend);
    }
    return forecast;
}

/**
 * Holt-Winters Method (Triple Exponential Smoothing) - for data with trend and seasonality.
 */
function holtWintersMethod(data: number[], periods: number, seasonLength: number, alpha: number = 0.3, beta: number = 0.1, gamma: number = 0.1): number[] {
    if (data.length < seasonLength) return holtsMethod(data, periods);

    let level = data[0];
    let trend = 0;
    const seasonal = Array.from({ length: seasonLength }, (_, i) => data[i % data.length] / (data.reduce((a, b) => a + b, 0) / data.length));

    for (let i = 0; i < data.length; i++) {
        const lastLevel = level;
        const seasonIndex = i % seasonLength;
        
        level = alpha * (data[i] / seasonal[seasonIndex]) + (1 - alpha) * (lastLevel + trend);
        trend = beta * (level - lastLevel) + (1 - beta) * trend;
        seasonal[seasonIndex] = gamma * (data[i] / level) + (1 - gamma) * seasonal[seasonIndex];
    }
    
    const forecast = [];
    for (let i = 1; i <= periods; i++) {
        const seasonIndex = (data.length + i - 1) % seasonLength;
        forecast.push((level + i * trend) * seasonal[seasonIndex]);
    }

    return forecast;
}