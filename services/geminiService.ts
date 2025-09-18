import { GoogleGenAI, Type } from "@google/genai";
import { Order, ForecastingModel, ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

/**
 * Generates a customer support response based on the user's query and optionally provided order details.
 */
export async function getCustomerSupportResponse(
    query: string, 
    order: Order | null,
    history: ChatMessage[] = []
): Promise<string> {
    const orderContext = order
        ? `Here is the customer's order information:
        - Order ID: ${order.id}
        - Customer Name: ${order.customerName}
        - Status: ${order.status}
        - Order Date: ${order.orderDate}
        - Estimated Delivery: ${order.estimatedDelivery}
        - Total Value: ${order.totalOrderValue}
        - Return Policy: ${order.returnPolicy}
        - Items:
          ${order.items.map(item => `  - ${item.quantity}x ${item.name} (${item.category}) at ${item.unitPrice} each`).join('\n')}`
        : "The user did not provide a valid order ID, or it could not be found. You must ask them for a valid order ID if their question requires one.";

    const systemInstruction = `You are a helpful and friendly customer support assistant for a retail company.
    Your tone should be empathetic and professional.
    Use the provided order details to answer the user's question accurately.
    Reference the conversation history to understand the context of the user's query.
    Do not make up information. If the order details don't answer the question, say so.
    Keep your answers concise and to the point.
    ${orderContext}`;

    // Map chat history to the format expected by the Gemini API
    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // Add the current user query to the end of the conversation history
    contents.push({ role: 'user', parts: [{ text: query }] });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                systemInstruction,
                temperature: 0.5,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Gemini API error in getCustomerSupportResponse:", error);
        throw new Error("Failed to get a response from the AI service.");
    }
}

/**
 * Generates qualitative analysis and pricing suggestions based on statistical forecasting results.
 */
export async function getForecastAnalysis(
    productName: string,
    historicalData: number[],
    forecast: number,
    model: ForecastingModel
): Promise<{ reasoning: string; pricingStrategy: string; marketingSuggestion: string; inventorySuggestion: string; }> {

    const prompt = `
    Analyze the following sales data and forecast for the product "${productName}" and provide strategic suggestions.

    **Forecasting Model Used:** ${model}
    **Historical Monthly Sales Data (oldest to newest):** ${historicalData.join(', ')}
    **Statistical Demand Forecast for Next Month:** ${forecast} units

    Based on this information, provide a JSON object with concise, actionable business advice.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        reasoning: {
                            type: Type.STRING,
                            description: "A brief, one-sentence explanation for the forecast based on historical trends (e.g., growth, decline, stability, seasonality)."
                        },
                        pricingStrategy: {
                            type: Type.STRING,
                            description: "A specific, one-sentence pricing suggestion. Examples: 'Offer a 15% weekend discount to capture impulse buys.' or 'Maintain premium pricing to match the strong, consistent demand.'"
                        },
                        marketingSuggestion: {
                            type: Type.STRING,
                            description: "A creative, one-sentence marketing idea to either boost sales or manage high demand. Examples: 'Launch a targeted social media ad campaign highlighting the product's benefits.' or 'Promote product bundles to increase average order value.'"
                        },
                        inventorySuggestion: {
                            type: Type.STRING,
                            description: "A practical, one-sentence inventory recommendation. Examples: 'Increase stock by 10% to meet the anticipated demand and avoid stockouts.' or 'Consider a just-in-time ordering strategy to reduce holding costs during this slow period.'"
                        }
                    },
                    required: ["reasoning", "pricingStrategy", "marketingSuggestion", "inventorySuggestion"]
                }
            }
        });
        
        const jsonStr = response.text.trim();
        const parsedResponse = JSON.parse(jsonStr);

        return {
            reasoning: parsedResponse.reasoning || "Analysis could not be generated.",
            pricingStrategy: parsedResponse.pricingStrategy || "Pricing suggestion could not be generated.",
            marketingSuggestion: parsedResponse.marketingSuggestion || "Marketing suggestion could not be generated.",
            inventorySuggestion: parsedResponse.inventorySuggestion || "Inventory suggestion could not be generated."
        };
    } catch (error) {
        console.error("Gemini API error in getForecastAnalysis:", error);
        throw new Error("Failed to get analysis from the AI service.");
    }
}