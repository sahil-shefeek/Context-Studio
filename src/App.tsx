import { Sidebar, MainContent } from "./components";

function App() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <MainContent />
    </div>
  );
}

export default App;
