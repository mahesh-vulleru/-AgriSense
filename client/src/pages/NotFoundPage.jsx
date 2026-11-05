import { Link } from 'react-router-dom';
import { Sprout, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button.jsx';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#F7F9F5] flex flex-col items-center justify-center p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#166534] mb-4">
        <Sprout className="h-8 w-8 text-[#22C55E]" />
      </div>
      <h1 className="text-4xl font-extrabold text-[#17251B]">404</h1>
      <h2 className="text-xl font-bold text-slate-700 mt-2">Field Route Not Found</h2>
      <p className="text-sm text-slate-500 max-w-md mt-2">
        The agricultural sector or resource you requested could not be located on the AgriSense grid.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="primary" icon={ArrowLeft}>
            Back to Dashboard
          </Button>
        </Link>
        <Link to="/">
          <Button variant="outline">
            Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;

