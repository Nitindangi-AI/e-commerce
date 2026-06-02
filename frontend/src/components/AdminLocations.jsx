import { useState, useEffect } from "react";
import { locationAPI } from "../services/api";
import toast from "react-hot-toast";

export default function AdminLocations() {
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csvData, setCsvData] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPincodes();
  }, []);

  const fetchPincodes = async () => {
    setLoading(true);
    try {
      const data = await locationAPI.getAllPincodes();
      setPincodes(data.pincodes || []);
    } catch (err) {
      toast.error("Failed to load pincodes");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!csvData) {
      toast.error("Please paste CSV data first");
      return;
    }

    setUploading(true);
    try {
      const data = await locationAPI.bulkUploadPincodes({ csvData });
      toast.success(data.message || "Pincodes uploaded successfully");
      if (data.errors && data.errors.length > 0) {
        console.warn("Upload Errors:", data.errors);
        toast.error(`${data.errors.length} records had errors. Check console.`);
      }
      setCsvData("");
      fetchPincodes();
    } catch (err) {
      toast.error(err.message || "Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this pincode?")) return;
    try {
      await locationAPI.deletePincode(id);
      toast.success("Pincode deleted");
      setPincodes(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Bulk Upload Section */}
      <div className="bg-luxe-card border border-white/5 rounded-2xl p-6">
        <h3 className="font-semibold mb-2">Bulk Upload Pincodes (CSV)</h3>
        <p className="text-xs text-white/40 mb-4">
          Paste CSV content. Required headers: <code className="gold-bg text-black px-1 rounded">pincode,state,district,city,area,isServiceable,estimatedDays,codAvailable</code>
        </p>
        <textarea
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          className="input-field w-full h-32 px-4 py-3 rounded-xl text-sm mb-4 font-mono whitespace-pre"
          placeholder="pincode,state,district,city,area,isServiceable,estimatedDays,codAvailable&#10;400058,Maharashtra,Mumbai Suburban,Mumbai,Andheri West,true,2,true"
        />
        <button
          onClick={handleBulkUpload}
          disabled={uploading}
          className="btn-gold py-2 px-6 rounded-xl text-sm font-bold tracking-widest uppercase disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload CSV"}
        </button>
      </div>

      {/* Pincodes List */}
      <div className="bg-luxe-card border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-semibold">Serviceable Pincodes ({pincodes.length})</h3>
          <button onClick={fetchPincodes} className="text-xs text-gold hover:underline">Refresh</button>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white/40 text-xs uppercase">
                <tr>
                  <th className="p-4 font-medium">Pincode</th>
                  <th className="p-4 font-medium">Location</th>
                  <th className="p-4 font-medium text-center">Serviceable</th>
                  <th className="p-4 font-medium text-center">COD</th>
                  <th className="p-4 font-medium text-center">Days</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pincodes.map(p => (
                  <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-mono font-medium">{p.pincode}</td>
                    <td className="p-4">
                      <p className="font-medium text-white/80">{p.cityName}</p>
                      <p className="text-xs text-white/40">{p.stateName}, {p.districtName}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${p.isServiceable ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {p.isServiceable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${p.codAvailable ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {p.codAvailable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 text-center">{p.estimatedDays}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleDelete(p._id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
                {pincodes.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-white/40">No pincodes configured</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
