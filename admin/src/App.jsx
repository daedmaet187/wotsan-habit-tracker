import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";

// Placeholder for Dashboard to satisfy Router dependencies
const Dashboard = () => (
  <Card className="w-full max-w-4xl mx-auto">
    <CardHeader>
      <CardTitle>Admin Dashboard</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Welcome to the Admin Interface.</p>
      <div className="mt-4 space-y-2">
        <Button>View Users</Button>
        <Button variant="secondary">Reports</Button>
      </div>
    </CardContent>
  </Card>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground p-4">
        <header className="border-b pb-2 mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Habit Tracker Admin</h1>
          <nav>
            <Link to="/">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
