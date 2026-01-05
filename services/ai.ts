
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Expense, Balance } from "../types";

export const getAIRecommendation = async (expenses: Expense[], balances: Balance[]) => {
  // Safe access to API KEY
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
  if (!apiKey) return "AI services temporarily unavailable. Please configure API key.";

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({ model: 'gemini-pro' });
  
  const prompt = `
    As a group expense assistant for an app called "Manas Split", analyze the following trip data and provide 2-3 short, logical recommendations for the group. 
    Focus on fairness and who should pay next.
    
    Participants and Net Balances (Positive means they are owed, Negative means they owe):
    ${balances.map(b => `${b.name}: Net ${b.net.toFixed(2)}`).join(', ')}
    
    Recent Expenses:
    ${expenses.slice(0, 5).map(e => `${e.title} (₹${e.amount}) paid by ${e.paidBy}`).join(', ')}
    
    Format the response as a simple list of advice.
  `;

  try {
    const response = await model.generateContent(prompt);
    return response.response.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "Consider asking the person with the most negative balance to pay next for better balance.";
  }
};
