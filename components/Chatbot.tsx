import React, { useState, useRef, useEffect } from 'react';
import { Order, ChatMessage } from '../types';
import { getCustomerSupportResponse } from '../services/geminiService';
import { SendIcon, UserIcon, BotIcon } from './icons/Icons';

interface ChatbotProps {
  orders: Order[];
}

const Chatbot: React.FC<ChatbotProps> = ({ orders }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: "Hello! I'm your customer support assistant. How can I help you with an order today?",
        timestamp: new Date().toLocaleTimeString(),
      }
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findOrderById = (id: string): Order | undefined => {
    return orders.find(order => order.id === id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text: userInput,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const orderIdMatch = userInput.match(/(?:order|id|#)\s*(\d+)/i);
      const orderId = orderIdMatch ? orderIdMatch[1] : null;
      const order = orderId ? findOrderById(orderId) : null;
      
      // Provide the last 10 messages as conversation history for context.
      const conversationHistory = messages.slice(-10);
      const botResponseText = await getCustomerSupportResponse(userInput, order, conversationHistory);

      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Error getting response from AI:", error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: "I'm sorry, but I'm having trouble connecting to my brain right now. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl mx-auto border border-slate-200">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-slate-800">Customer Support AI</h2>
      </div>
      <div className="h-[60vh] overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'bot' && <BotIcon className="h-8 w-8 text-indigo-500 flex-shrink-0" />}
            <div className={`max-w-lg p-3 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-800'}`}>
              <p className="text-sm">{msg.text}</p>
              <p className="text-xs opacity-70 mt-1 text-right">{msg.timestamp}</p>
            </div>
            {msg.sender === 'user' && <UserIcon className="h-8 w-8 text-slate-500 flex-shrink-0" />}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <BotIcon className="h-8 w-8 text-indigo-500 flex-shrink-0" />
            <div className="max-w-lg p-3 rounded-lg bg-slate-200 text-slate-800">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow text-white p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            aria-label="Send message"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;