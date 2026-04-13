import React, { useState } from 'react';
import { SparklesIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const AIShoppingAssistant = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI shopping concierge. Ask me for gift ideas, budget-friendly picks, or category recommendations!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Mock AI response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Based on "${input}", I recommend checking our collectibles or art categories. Try searching for "bitcoin gifts" or "crypto art"! 💡`,
      }]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-200 shadow-lg">
      <div className="flex items-center mb-4">
        <SparklesIcon className="h-6 w-6 text-indigo-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">AI Shopping Assistant</h3>
      </div>
      <div className="h-64 overflow-y-auto space-y-3 mb-4 p-4 bg-white/50 rounded-2xl backdrop-blur-sm">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-white shadow-sm border'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm border px-4 py-2 rounded-2xl animate-pulse">Thinking...</div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. best gifts under $100..."
          className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-3 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center"
        >
          <PaperAirplaneIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default AIShoppingAssistant;

