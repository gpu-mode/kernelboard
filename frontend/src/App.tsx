import "./App.css";

// client/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from "./pages/About";
import AppLayout from "./components/app-layout/AppLayout";

function App() {
  return (
    <BrowserRouter basename="/kb">
      <AppLayout>
        <Routes>
          <Route path="/about" element={<About />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
