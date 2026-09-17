import { useEffect, useState } from "react";
import DesignPreview from "@/pages/DesignPreview";

function App() {
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setIsPreview(
      import.meta.env.DEV &&
        new URLSearchParams(window.location.search).get("preview") === "1",
    );
  }, []);

  if (isPreview) {
    return <DesignPreview />;
  }

  return (
    <main className="flex h-full items-center justify-center">
      <p className="text-text-muted">Hello Solo Task</p>
    </main>
  );
}

export default App;
