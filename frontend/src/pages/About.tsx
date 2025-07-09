import { useEffect, useState } from "react";
import { fetchAboutInfo } from "../api/api";

// client/src/pages/About.tsx
export default function About() {
  const [data, setData] = useState<string>("");
  useEffect(() => {
    fetchAboutInfo().then((d) => {
      setData(d);
    });
  }, []);

  return (
    <div>
      <h1>About us</h1>
      <div> {data} </div>
    </div>
  );
}
