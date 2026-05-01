import { useEffect } from "react";
import LoginPage from "./LoginPage";

const Index = () => {
  useEffect(() => {
    if (window.location.pathname === "/") {
      window.location.replace("/landing.html");
    }
  }, []);

  if (window.location.pathname === "/") return null;

  return <LoginPage />;
};

export default Index;