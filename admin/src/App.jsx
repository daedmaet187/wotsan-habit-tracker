import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div className="p-8 text-2xl">Login (coming soon)</div>} />
        <Route path="/dashboard" element={<div className="p-8 text-2xl">Dashboard (coming soon)</div>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;