import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MetricChart({ data, metricKey, color, label }) {
    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id={`color${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        minTickGap={20}
                        tickFormatter={(timeStr) => {
                            try {
                                const date = new Date(timeStr);
                                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                            } catch (e) {
                                return timeStr;
                            }
                        }}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        domain={[0, 100]}
                        unit={metricKey === 'dbLatency' ? 'ms' : '%'}
                    />
                    <Tooltip 
                        labelFormatter={(value) => {
                            try {
                                return new Date(value).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit', 
                                    second: '2-digit',
                                    hour12: false,
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                });
                            } catch (e) {
                                return value;
                            }
                        }}
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            padding: '12px'
                        }}
                        itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Area
                        type="monotone"
                        dataKey={metricKey}
                        name={label}
                        stroke={color}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill={`url(#color${metricKey})`}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
