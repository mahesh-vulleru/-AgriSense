import Card, { CardHeader } from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';

const sampleFields = [
  {
    name: 'Sector A – Durum Wheat',
    area: '14 Acres',
    moisture: 42,
    moistureStatus: 'optimal',
    ph: 6.8,
    healthScore: 95,
  },
  {
    name: 'Sector B – Sweet Corn / Maize',
    area: '9 Acres',
    moisture: 33,
    moistureStatus: 'attention',
    ph: 6.4,
    healthScore: 82,
  },
  {
    name: 'Sector C – Heirloom Tomatoes',
    area: '5.5 Acres',
    moisture: 48,
    moistureStatus: 'optimal',
    ph: 6.9,
    healthScore: 91,
  },
];

export const FieldStatusCard = () => {
  return (
    <Card className="col-span-12 lg:col-span-4">
      <CardHeader
        title="Field Sectors & Health"
        subtitle="Active cultivation zones"
        action={
          <Badge size="sm" variant="neutral">
            Sample Data
          </Badge>
        }
      />

      <div className="space-y-4">
        {sampleFields.map((field) => (
          <div
            key={field.name}
            className="p-3.5 rounded-lg border border-slate-100 bg-[#F7F9F5]/80 hover:bg-white hover:border-slate-200 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#17251B]">{field.name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{field.area}</p>
              </div>
              <Badge
                size="sm"
                variant={field.moistureStatus === 'optimal' ? 'success' : 'warning'}
                dot
              >
                {field.moistureStatus === 'optimal' ? 'Optimal' : 'Needs Water'}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white py-1.5 px-2 rounded-md border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Moisture</span>
                <span className="font-bold text-[#17251B]">{field.moisture}%</span>
              </div>
              <div className="bg-white py-1.5 px-2 rounded-md border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Soil pH</span>
                <span className="font-bold text-[#17251B]">{field.ph}</span>
              </div>
              <div className="bg-white py-1.5 px-2 rounded-md border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Health</span>
                <span className="font-bold text-[#166534]">{field.healthScore}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Soil Nutrient Index (NPK avg)</span>
          <span className="font-semibold text-[#145A32]">Good Balance</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
          <div className="bg-[#166534] h-2 w-[40%]" title="Nitrogen: 40%" />
          <div className="bg-[#22C55E] h-2 w-[35%]" title="Phosphorus: 35%" />
          <div className="bg-amber-400 h-2 w-[25%]" title="Potassium: 25%" />
        </div>
      </div>
    </Card>
  );
};

export default FieldStatusCard;

