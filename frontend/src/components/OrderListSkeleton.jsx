import React from 'react';

export default function OrderListSkeleton() {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 dark:border-white/5">
            <th className="py-3 px-4"><div className="skeleton h-4 w-20" /></th>
            <th className="py-3 px-4"><div className="skeleton h-4 w-24" /></th>
            <th className="py-3 px-4"><div className="skeleton h-4 w-16" /></th>
            <th className="py-3 px-4"><div className="skeleton h-4 w-20" /></th>
          </tr>
        </thead>
        <tbody>
          {[...Array(3)].map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-gray-50 dark:border-white/[0.02]">
              <td className="py-4 px-4"><div className="skeleton h-4 w-28" /></td>
              <td className="py-4 px-4"><div className="skeleton h-4 w-20" /></td>
              <td className="py-4 px-4"><div className="skeleton h-4 w-16" /></td>
              <td className="py-4 px-4"><div className="skeleton h-4 w-24" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
