import React, { useState, useCallback, useEffect } from 'react';
import { AppView, Order, SalesRecord } from './types';
import Header from './components/Header';
import Chatbot from './components/Chatbot';
import Forecaster from './components/Forecaster';
import { fetchDataFromUrl, processOrdersToSalesData } from './services/dataService';

// The application will now always load data from this hardcoded URL.
const DATA_URL = "https://gist.githubusercontent.com/devesh-dkp/04406dd4928f7e869eb097b9e8f3e4da/raw/b06de629e7a69707e672da6737e59fb4be9736a5/my-mock-orders.json";

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.FORECASTER);
  
  // Unified data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    // Load data from the hardcoded URL on initial mount
    const loadInitialData = async () => {
      setIsDataLoading(true);
      setDataError(null);
      try {
        const fetchedOrders = await fetchDataFromUrl(DATA_URL);
        const processedSalesData = processOrdersToSalesData(fetchedOrders);
        setOrders(fetchedOrders);
        setSalesData(processedSalesData);
      } catch (error) {
        if (error instanceof Error) {
          setDataError(error.message);
        } else {
          setDataError('An unknown error occurred while loading data.');
        }
      } finally {
        setIsDataLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  const handleViewChange = useCallback((view: AppView) => {
    setCurrentView(view);
  }, []);

  const renderContent = () => {
    if (isDataLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      );
    }

    if (dataError) {
      return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" role="alert">
          <p className="font-bold">Data Loading Error</p>
          <p>{dataError}</p>
        </div>
      );
    }
    
    if (currentView === AppView.CHATBOT) {
      return <Chatbot orders={orders} />;
    }
    
    if (currentView === AppView.FORECASTER) {
      return <Forecaster salesData={salesData} />;
    }

    return null;
  };

  return (
    <div className="bg-slate-100 min-h-screen font-sans text-slate-800">
      <Header 
        currentView={currentView} 
        onNavigate={handleViewChange}
      />
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;