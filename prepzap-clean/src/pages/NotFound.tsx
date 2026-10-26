import { useLocation } from "react-router-dom";
import { Mascot } from "@/components/Mascot";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F0EDE0]">
      <div className="text-center">
        <Mascot mood="encouraging" size="lg" className="mx-auto" interactive />
        <h1 className="mb-4 text-[48px] font-black">404</h1>
        <p className="mb-4 text-xl text-black/60 font-bold">Oops! Page not found</p>
        <a href="/" className="border-2 border-black bg-[#FF4D2E] text-white px-6 py-3 font-extrabold shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 transition-all block w-max mx-auto mt-6">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
