import React, { useState, useEffect } from 'react';
import { Menu, DollarSign, ChevronLeft, BarChart, History, XCircle, CheckCircle, RotateCcw } from 'lucide-react';

// The actual Google Apps Script URL provided by the user.
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJNZAJodWgPYkhN5m-MnGS8a8hqrErhfO87TO8BpNMSdjUg27bWMiGGIY9F51oEKRc/exec";

// A custom modal component to replace alert/confirm
const CustomModal = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              取消
            </button>
          )}
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              確定
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// The App component is the main container for the entire application.
const App = () => {
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState('main'); // 'main', 'revenue', 'history'
  const [modal, setModal] = useState(null); // State for the custom modal

  const mockMonthlyRevenue = "資料無法取得";
  const mockDailyRevenueData = [
    // This data is for the chart, but a real implementation would need a backend to provide it.
    { name: '1日', revenue: 0 },
  ];

  // The main function to fetch all orders from the Google Apps Script.
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Filter the data into current orders and history based on the '狀態' column from the Apps Script.
      const currentOrders = data.filter(order => order.狀態 === undefined || order.狀態 === null || order.狀態 === '');
      const historicalOrders = data.filter(order => order.狀態 === '已出餐' || order.狀態 === '已刪除');
      
      setOrders(currentOrders);
      setHistory(historicalOrders.reverse()); // Reverse to show the most recent history first.
      
      // Calculate today's revenue, only including items with a '已出餐' status.
      // 這裡已修改：只計算狀態為 '已出餐' 的訂單。
      const revenue = data
        .filter(order => order.狀態 === '已出餐')
        .reduce((sum, order) => sum + Number(order.總價), 0);
      setTodayRevenue(revenue);

    } catch (error) {
      console.error("Error fetching data:", error);
      setModal({
        title: "載入資料時發生錯誤",
        message: `請檢查網路連線或 Apps Script 設定。錯誤訊息: ${error.message}`,
        onConfirm: () => setModal(null)
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Function to handle confirming an order.
  const handleConfirmOrder = async (order) => {
    setLoading(true);
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          mode: 'confirm',
          rowIndex: order.rowIndex,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchData(); // Re-fetch all data to get the updated list from the server.

    } catch (error) {
      console.error("Error confirming order:", error);
      setModal({
        title: "確認訂單時發生錯誤",
        message: `錯誤訊息: ${error.message}`,
        onConfirm: () => setModal(null)
      });
    } finally {
      setLoading(false);
      setModal(null); // Close the modal
    }
  };
  
  // Function to handle soft-deleting an order from the main view.
  const handleSoftDeleteMainOrder = async (order) => {
    setLoading(true);
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          mode: 'softDelete',
          rowIndex: order.rowIndex,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await fetchData(); // Re-fetch all data to get the updated list from the server.

    } catch (error) {
      console.error("Error soft-deleting order:", error);
      setModal({
        title: "刪除訂單時發生錯誤",
        message: `錯誤訊息: ${error.message}`,
        onConfirm: () => setModal(null)
      });
    } finally {
      setLoading(false);
      setModal(null); // Close the modal
    }
  };
  
  // Function to handle restoring an order from the history view.
  const handleRestoreOrder = async (order) => {
    setLoading(true);
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          mode: 'restore',
          rowIndex: order.rowIndex,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchData(); // Re-fetch all data to get the updated list from the server.

    } catch (error) {
      console.error("Error restoring order:", error);
      setModal({
        title: "還原訂單時發生錯誤",
        message: `錯誤訊息: ${error.message}`,
        onConfirm: () => setModal(null)
      });
    } finally {
      setLoading(false);
      setModal(null); // Close the modal
    }
  };
  
  // Initial data fetch and auto-refresh setup
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 30000); // Auto-refresh every 30 seconds.
    return () => clearInterval(intervalId);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const switchView = (newView) => {
    setView(newView);
    setSidebarOpen(false);
  };

  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out bg-gray-900 text-white w-64 p-4 z-40 md:relative md:translate-x-0 md:bg-gray-900 md:p-4 md:w-auto`}>
      <div className="flex justify-end md:hidden">
        <button onClick={toggleSidebar} className="text-white">
          <ChevronLeft />
        </button>
      </div>
      <nav className="mt-8 flex flex-col space-y-4">
        <button onClick={() => switchView('main')} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Menu className="w-5 h-5" />
          <span>主頁面</span>
        </button>
        <button onClick={() => switchView('revenue')} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 transition-colors">
          <BarChart className="w-5 h-5" />
          <span>營業額報告</span>
        </button>
        <button onClick={() => switchView('history')} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-700 transition-colors">
          <History className="w-5 h-5" />
          <span>歷史紀錄</span>
        </button>
      </nav>
    </div>
  );

  const MainView = () => (
    <div className="p-4 flex-grow overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">當前訂單</h2>
      {loading && <p className="text-center text-lg text-gray-500">載入中...</p>}
      <div className="space-y-4">
        {orders.length > 0 ? (
          orders.map(order => (
            <div
              key={order.rowIndex} // Using rowIndex as key for real data
              className="bg-white p-4 rounded-xl shadow-lg border-l-4 border-blue-500"
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-xl font-semibold text-gray-900">
                    訂單編號: {order.訂單編號}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    時間: {new Date(order.Timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-green-600">
                    ${order.總價}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmOrder(order);
                    }}
                    className="p-2 px-4 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-md"
                    title="確認出餐"
                  >
                    確認出餐
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal({
                        title: "確認刪除",
                        message: "確定要將此訂單標記為已刪除嗎？此操作會將訂單從主列表移除。",
                        onConfirm: () => handleSoftDeleteMainOrder(order),
                        onCancel: () => setModal(null)
                      });
                    }}
                    className="p-2 px-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                    title="刪除訂單"
                  >
                    刪除訂單
                  </button>
                </div>
              </div>
              <div className="mt-4 border-t pt-2 border-gray-200">
                <p className="text-gray-600 font-medium">品項:</p>
                <ul className="list-disc list-inside ml-2 text-gray-700 text-sm">
                  {order.品項?.split(',').map((item, index) => (
                    <li key={index}>{item.trim()}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        ) : (
          !loading && <p className="text-center text-lg text-gray-500">目前沒有新訂單</p>
        )}
      </div>
    </div>
  );

  const HistoryView = () => (
    <div className="p-4 flex-grow overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">歷史紀錄</h2>
      {loading && <p className="text-center text-lg text-gray-500">載入中...</p>}
      <div className="space-y-4">
        {history.length > 0 ? (
          history.map(order => (
            <div
              key={order.rowIndex}
              className={`bg-white p-4 rounded-xl shadow-lg border-l-4 ${order.狀態 === '已刪除' ? 'border-red-500' : 'border-gray-500'}`}
            >
              <div className={`flex justify-between items-center mb-2 ${order.狀態 === '已刪除' ? 'line-through text-gray-400' : ''}`}>
                <div>
                  <span className="text-xl font-semibold text-gray-900">
                    訂單編號: {order.訂單編號}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    時間: {new Date(order.Timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`text-2xl font-bold ${order.狀態 === '已刪除' ? 'text-red-500' : 'text-gray-600'}`}>
                    ${order.總價}
                  </span>
                  {order.狀態 === '已刪除' ? (
                    <div className="flex items-center space-x-2">
                       <span className="text-sm font-semibold text-red-500">已刪除</span>
                       <button
                         onClick={() => handleRestoreOrder(order)}
                         className="p-2 px-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors shadow-md text-sm"
                         title="還原訂單"
                       >
                         <RotateCcw className="w-4 h-4" />
                       </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-500">已出餐</span>
                      <button
                        className="p-2 px-4 bg-gray-300 text-white rounded-full transition-colors shadow-md text-sm cursor-not-allowed"
                        disabled
                      >
                       <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className={`mt-4 border-t pt-2 border-gray-200 ${order.狀態 === '已刪除' ? 'line-through text-gray-400' : ''}`}>
                <p className="text-gray-600 font-medium">品項:</p>
                <ul className="list-disc list-inside ml-2 text-gray-700 text-sm">
                  {order.品項?.split(',').map((item, index) => (
                    <li key={index}>{item.trim()}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        ) : (
          !loading && <p className="text-center text-lg text-gray-500">目前沒有歷史訂單</p>
        )}
      </div>
    </div>
  );

  const RevenueView = () => (
    <div className="p-4 flex-grow overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">營業額報告</h2>
      <div className="bg-white p-6 rounded-xl shadow-lg mb-6 text-center">
        <p className="text-gray-500 text-sm">本月累積營業額 (僅統計已出餐訂單)</p>
        <p className="text-4xl font-extrabold text-blue-600">資料無法取得</p>
      </div>

      <h3 className="text-xl font-bold mb-4 text-gray-800">每日營業額折線圖</h3>
      <div className="bg-white p-6 rounded-xl shadow-lg" style={{ width: '100%', height: 300 }}>
        <div className="flex items-center justify-center h-full text-lg text-gray-500">
          <p>圖表資料無法取得</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen font-sans flex flex-col md:flex-row">
      {modal && <CustomModal {...modal} />}
      <Sidebar />
      <div className="flex-grow flex flex-col max-h-screen">
        <header className="bg-white p-4 shadow-md flex justify-between items-center rounded-b-xl sticky top-0 z-30">
          <button onClick={toggleSidebar} className="p-2 text-gray-700 md:hidden">
            <Menu />
          </button>
          <h1 className="text-xl font-bold text-gray-900">內場出餐管理</h1>
          <div onClick={() => switchView('revenue')} className="flex items-center space-x-2 bg-blue-100 p-2 rounded-full cursor-pointer hover:bg-blue-200 transition-colors">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-600 text-sm">
              今日: ${todayRevenue.toFixed(0)}
            </span>
          </div>
        </header>

        {view === 'main' && <MainView />}
        {view === 'revenue' && <RevenueView />}
        {view === 'history' && <HistoryView />}
      </div>
    </div>
  );
};

export default App;
