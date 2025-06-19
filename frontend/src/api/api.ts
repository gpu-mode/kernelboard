export const getAbout = async () => {
    try {
      const res = await fetch(`/api/hello`);
      console.log(res);
      return res.json();
    } catch (err) {
      console.error("Fetch failed fetchMessage:", err);
      throw err;
    }
  };
