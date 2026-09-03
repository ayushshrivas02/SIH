'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart as LucideLineChart, UploadCloud, Play, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalysisPage() {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, { min: number, max: number, avg: number }>>({});
  
  const [prompt, setPrompt] = useState('Analyze the temperature trends and identify any abnormal readings.');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim());
    setColumns(headers);

    const parsedData = [];
    const numCols = headers.filter(h => h.toLowerCase() !== 'timestamp' && h.toLowerCase() !== 'date');
    const tempStats: Record<string, { min: number, max: number, sum: number, count: number }> = {};
    
    numCols.forEach(col => {
      tempStats[col] = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
    });

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((h, index) => {
        const val = values[index];
        const numVal = parseFloat(val);
        
        if (!isNaN(numVal) && h.toLowerCase() !== 'timestamp' && h.toLowerCase() !== 'date') {
          row[h] = numVal;
          if (tempStats[h]) {
            tempStats[h].min = Math.min(tempStats[h].min, numVal);
            tempStats[h].max = Math.max(tempStats[h].max, numVal);
            tempStats[h].sum += numVal;
            tempStats[h].count += 1;
          }
        } else {
          row[h] = val;
        }
      });
      parsedData.push(row);
    }

    const finalStats: Record<string, { min: number, max: number, avg: number }> = {};
    Object.keys(tempStats).forEach(col => {
      if (tempStats[col].count > 0) {
        finalStats[col] = {
          min: tempStats[col].min,
          max: tempStats[col].max,
          avg: Number((tempStats[col].sum / tempStats[col].count).toFixed(2))
        };
      }
    });

    setData(parsedData);
    setStats(finalStats);
    setAiResponse('');
  };

  const handleAIAnalyze = async () => {
    if (data.length === 0) return;
    
    setAnalyzing(true);
    setAiResponse('');

    const datasetSummary = JSON.stringify({
      rowCount: data.length,
      columns: columns,
      statistics: stats
    }, null, 2);

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetSummary, prompt }),
      });

      const response = await res.json();
      if (!res.ok) throw new Error(response.error || 'Analysis failed');
      setAiResponse(response.result);
    } catch (error) {
      toast({
        title: 'Analysis Error',
        description: 'Failed to connect to AI provider.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const numericColumns = Object.keys(stats);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Analysis</h1>
          <p className="text-zinc-400">Analyze sensor data and CSV datasets.</p>
        </div>
        <div className="relative">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
            accept=".csv"
          />
          <Button className="bg-blue-600 hover:bg-blue-700 w-full">
            <UploadCloud className="mr-2 h-4 w-4" /> Upload CSV
          </Button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Dataset Statistics</CardTitle>
                <CardDescription>Deterministic calculations (Mean, Min, Max)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>Column</TableHead>
                      <TableHead>Min</TableHead>
                      <TableHead>Max</TableHead>
                      <TableHead>Average</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {numericColumns.map(col => (
                      <TableRow key={col} className="border-zinc-800">
                        <TableCell className="font-medium text-blue-400">{col}</TableCell>
                        <TableCell>{stats[col].min}</TableCell>
                        <TableCell>{stats[col].max}</TableCell>
                        <TableCell>{stats[col].avg}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Visualization</CardTitle>
                <CardDescription>Time-series rendering</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.slice(0, 100)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey={columns[0]} stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => val.toString().substring(0,5)} />
                    <YAxis stroke="#a1a1aa" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                    <Legend />
                    {numericColumns.map((col, idx) => (
                      <Line key={col} type="monotone" dataKey={col} stroke={idx === 0 ? "#3b82f6" : "#10b981"} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900 border-zinc-800 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-400" />
                AI Interpretation
              </CardTitle>
              <CardDescription>Let AI explain the trends based on actual calculated data.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <div className="space-y-2">
                <Textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-zinc-950 border-zinc-700 text-zinc-200 resize-none h-20"
                />
              </div>
              <Button onClick={handleAIAnalyze} disabled={analyzing} className="bg-blue-600 hover:bg-blue-700">
                <Play className="mr-2 h-4 w-4" /> {analyzing ? 'Analyzing...' : 'Generate Insights'}
              </Button>
              
              <div className="flex-1 mt-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 h-full min-h-[300px] overflow-y-auto prose prose-invert max-w-none">
                  {aiResponse ? (
                    <div className="whitespace-pre-wrap text-zinc-200 text-sm">{aiResponse}</div>
                  ) : analyzing ? (
                     <div className="flex items-center justify-center h-full text-zinc-500">
                       Processing statistics...
                     </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-600 italic">
                      Click generate to see AI insights.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {data.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <LucideLineChart className="h-16 w-16 mb-4 text-zinc-700" />
            <p>Upload a CSV file with sensor or operational data to begin analysis.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
