"use client"

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts"

interface DashboardChartsProps {
  categoryData: { name: string; value: number }[]
  statusData: { status: string; count: number }[]
}

const GOLD_PALETTE = [
  "#C69F68", // Champagne Gold
  "#E5C38E", // Light Gold
  "#8C7A6B", // Bronze
  "#D4AF37", // Rich Gold
  "#A89F91", // Sand
  "#564031", // Warm Walnut
  "#B89058", // Deep Ochre
]

import { useLanguage } from "@/context/language-context"

export function DashboardCharts({ categoryData, statusData }: DashboardChartsProps) {
  const { t } = useLanguage()

  // Translate category & status items for charts
  const translatedCategoryData = categoryData.map(c => ({
    ...c,
    displayName: t[c.name as keyof typeof t] || c.name.replace(/ \/ Nikah/i, '')
  }))

  const translatedStatusData = statusData.map(s => ({
    ...s,
    displayStatus: t[s.status as keyof typeof t] || s.status
  }))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Category Breakdown */}
      <div className="rounded-2xl border border-[#26211c] bg-[#141210]/90 p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c69f68]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-[#c69f68] font-serif">
              {t.categoryDistributionTitle}
            </h3>
            <p className="text-xs text-[#8c7a6b]">{t.categoryDistributionSubtitle}</p>
          </div>
        </div>

        {translatedCategoryData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-[#70665a]">
            {t.noSessionsData}
          </div>
        ) : (
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={translatedCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="displayName"
                >
                  {translatedCategoryData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={GOLD_PALETTE[index % GOLD_PALETTE.length]} 
                      stroke="#0b0a09"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161412', 
                    borderColor: '#29241f',
                    borderRadius: '8px',
                    color: '#f5f2eb',
                    fontSize: '12px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-1.5 pl-2 text-xs">
              {translatedCategoryData.slice(0, 5).map((item, idx) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: GOLD_PALETTE[idx % GOLD_PALETTE.length] }} 
                  />
                  <span className="text-[#a89f91] capitalize text-[11px] truncate max-w-[100px]">
                    {item.displayName}
                  </span>
                  <span className="font-semibold text-[#f5f2eb] text-[11px]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Workflow Status Funnel */}
      <div className="rounded-2xl border border-[#26211c] bg-[#141210]/90 p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c69f68]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase text-[#c69f68] font-serif">
              {t.workflowFunnelTitle}
            </h3>
            <p className="text-xs text-[#8c7a6b]">{t.workflowFunnelSubtitle}</p>
          </div>
        </div>

        {translatedStatusData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-[#70665a]">
            {t.noWorkflowData}
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={translatedStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis 
                  dataKey="displayStatus" 
                  stroke="#70665a" 
                  fontSize={10} 
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  stroke="#70665a" 
                  fontSize={10} 
                  tickLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161412', 
                    borderColor: '#29241f',
                    borderRadius: '8px',
                    color: '#f5f2eb',
                    fontSize: '12px'
                  }} 
                />
                <Bar 
                  dataKey="count" 
                  fill="#c69f68" 
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
