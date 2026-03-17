'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '@/lib/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface SusSummary {
  count: number;
  avgScore: number;
  responses: { _id: string; userId: { displayName: string; email: string }; susScore: number; comment: string | null; createdAt: string }[];
}

export default function AdminFeedbackPage() {
  const [data, setData] = useState<SusSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/feedback/sus').then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const scoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'OK';
    return 'Poor';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">User Feedback</h1>
        <p className="mt-1 text-[16px] text-muted-foreground">System Usability Scale (SUS) responses</p>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {data && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-3">
            <Card className="border-border/60 bg-white shadow-sm">
              <CardContent className="p-6">
                <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Responses</p>
                <p className="mt-1 text-[36px] font-bold text-foreground">{data.count}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-white shadow-sm">
              <CardContent className="p-6">
                <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Average SUS Score</p>
                <p className="mt-1 text-[36px] font-bold text-foreground">{data.avgScore}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-white shadow-sm">
              <CardContent className="p-6">
                <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Rating</p>
                <p className="mt-1 text-[36px] font-bold text-foreground">{data.count > 0 ? scoreLabel(data.avgScore) : '—'}</p>
              </CardContent>
            </Card>
          </div>

          {data.responses.length > 0 && (
            <Card className="border-border/60 bg-white shadow-sm">
              <CardContent className="p-6">
                <h2 className="mb-4 text-[16px] font-semibold text-foreground">Individual Responses</h2>
                <div className="flex flex-col gap-3">
                  {data.responses.map((r) => (
                    <div key={r._id} className="rounded-lg border border-border/50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[15px] font-medium text-foreground">{r.userId?.displayName}</p>
                          <p className="text-[13px] text-muted-foreground">{r.userId?.email}</p>
                        </div>
                        <span className="text-[20px] font-bold text-primary">{r.susScore}</span>
                      </div>
                      {r.comment && (
                        <p className="mt-2 text-[14px] text-muted-foreground italic">&ldquo;{r.comment}&rdquo;</p>
                      )}
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
