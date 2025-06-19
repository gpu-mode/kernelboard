import { useEffect, useState } from "react";
import { getAbout } from "../api/api";

// client/src/pages/About.tsx
export default function About() {
      const [data, setData] = useState({});
      useEffect(() => {
          getAbout().then((data) => {
              setData(data);
          });
          }, []);
    return (
        <div>
            <h1>About Page</h1>
            <div>{JSON.stringify(data)}</div>
        </div>
    );
}
