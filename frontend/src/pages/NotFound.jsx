import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 pt-20">
      <div className="relative mb-8">
        <h1 className="display text-[10rem] md:text-[14rem] font-black gold leading-none opacity-20">404</h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <div>
            <h2 className="display text-3xl md:text-4xl font-black mb-2">Page Not Found</h2>
            <p className="text-white/50 max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-4">
        <Link to="/" className="btn-gold px-8 py-3 rounded-full tracking-widest uppercase text-sm">
          Go Home
        </Link>
        <Link to="/shop" className="btn-outline px-8 py-3 rounded-full tracking-widest uppercase text-sm">
          Browse Shop
        </Link>
      </div>
    </div>
  );
}
