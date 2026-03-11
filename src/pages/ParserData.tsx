import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  Upload, Database, FileCode, FileText, Download, Trash2, ChevronDown, ChevronRight,
  Layers, GitBranch, Hash, Eye, Loader2, RefreshCw, FileSpreadsheet, ExternalLink,
} from 'lucide-react';
import api from '@/services/api';

interface ParserSession {
  id: string;
  session_name: string;
  source_file_name: string;
  total_processed_files: number;
  total_included_files: number;
  total_define_vars: number;
  created_at: string;
}

const parserApi = {
  seed: (data: { jsonData?: any; sessionName?: string }) =>
    api.post('/parser/seed', data),
  listSessions: () => api.get('/parser/sessions'),
  getSession: (id: string) => api.get(`/parser/sessions/${id}`),
  deleteSession: (id: string) => api.delete(`/parser/sessions/${id}`),
  exportCSV: (id: string, sheet: string) =>
    api.get(`/parser/sessions/${id}/export`, { params: { sheet }, responseType: 'blob' }),
};

export default function ParserData() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sessionName, setSessionName] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [uploadedJson, setUploadedJson] = useState<any>(null);
  const [fileName, setFileName] = useState('');

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['parser-sessions'],
    queryFn: async () => (await parserApi.listSessions()).data as ParserSession[],
  });

  const { data: sessionDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['parser-session', selectedSession],
    queryFn: async () => (await parserApi.getSession(selectedSession!)).data,
    enabled: !!selectedSession,
  });

  const seedMutation = useMutation({
    mutationFn: (data: { jsonData?: any; sessionName?: string }) => parserApi.seed(data),
    onSuccess: (res) => {
      toast.success(`Seeded successfully! ${res.data.stats.processedFiles} files, ${res.data.stats.defineVars} defines`);
      queryClient.invalidateQueries({ queryKey: ['parser-sessions'] });
      setSelectedSession(res.data.sessionId);
    },
    onError: () => toast.error('Seed failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => parserApi.deleteSession(id),
    onSuccess: () => {
      toast.success('Session deleted');
      queryClient.invalidateQueries({ queryKey: ['parser-sessions'] });
      setSelectedSession(null);
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        setUploadedJson(json);
        toast.success(`Parsed ${file.name} successfully`);
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleSeed = () => {
    seedMutation.mutate({
      jsonData: uploadedJson || undefined,
      sessionName: sessionName || `Import ${new Date().toLocaleString()}`,
    });
  };

  const handleExport = async (sheet: string) => {
    if (!selectedSession) return;
    try {
      const res = await parserApi.exportCSV(selectedSession, sheet);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sheet}_${selectedSession.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${sheet} as CSV`);
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileCode className="h-6 w-6 text-primary" />
          C/C++ Parser Data Manager
        </h1>
        <p className="text-muted-foreground mt-1">
          Import, seed, and analyze MakeOpt C/C++ preprocessor parser data
        </p>
      </div>

      {/* Import Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" /> Import & Seed
          </CardTitle>
          <CardDescription>
            Upload a MakeOptCCPPFileParser.json or use the built-in sample data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              {fileName && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {fileName}
                  {uploadedJson && <Badge variant="outline" className="text-xs ml-1">Ready</Badge>}
                </p>
              )}
            </div>
            <Input
              placeholder="Session name (optional)"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="sm:w-64"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSeed} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Seeding...</>
              ) : (
                <><Database className="h-4 w-4 mr-2" /> {uploadedJson ? 'Seed Uploaded JSON' : 'Seed Sample Data'}</>
              )}
            </Button>
            {uploadedJson && (
              <Button variant="ghost" onClick={() => { setUploadedJson(null); setFileName(''); }}>
                Clear Upload
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5" /> Seeded Sessions
            <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['parser-sessions'] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : !sessions?.length ? (
            <p className="text-muted-foreground">No sessions yet. Import and seed data to get started.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSession === s.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedSession(s.id)}
                >
                  <div>
                    <p className="font-medium text-foreground">{s.session_name}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><FileCode className="h-3 w-3" /> {s.total_processed_files} files</span>
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {s.total_included_files} includes</span>
                      <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {s.total_define_vars} defines</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/editor?parserSession=${s.id}`);
                      }}
                      title="Load in Config Editor"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" /> Editor
                    </Button>
                    <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(s.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Detail */}
      {selectedSession && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" /> Session Data
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => navigate(`/editor?parserSession=${selectedSession}`)}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Open in Config Editor
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('summary')}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Summary
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('processedFiles')}>
                  <Download className="h-4 w-4 mr-1" /> Files CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('includedFiles')}>
                  <Download className="h-4 w-4 mr-1" /> Includes CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('defineVars')}>
                  <Download className="h-4 w-4 mr-1" /> Defines CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetail ? (
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : sessionDetail ? (
              <Tabs defaultValue="processed" className="w-full">
                <TabsList>
                  <TabsTrigger value="processed">
                    Processed Files ({sessionDetail.processedFiles?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="included">
                    Included Files ({sessionDetail.includedFiles?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="defines">
                    Define Variables ({sessionDetail.defineVars?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="processed">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Lines</TableHead>
                          <TableHead className="text-right">#if</TableHead>
                          <TableHead className="text-right">#else</TableHead>
                          <TableHead className="text-right">#endif</TableHead>
                          <TableHead className="text-right">Nested Blk</TableHead>
                          <TableHead className="text-right">Def Hits</TableHead>
                          <TableHead className="text-right">Macros</TableHead>
                          <TableHead className="text-right">Time (s)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionDetail.processedFiles?.map((f: any) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-mono text-xs">{f.file_name}</TableCell>
                            <TableCell><Badge variant="outline">{f.file_type}</Badge></TableCell>
                            <TableCell className="text-right">{f.input_line_count?.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{f.cond_if}</TableCell>
                            <TableCell className="text-right">{f.cond_else}</TableCell>
                            <TableCell className="text-right">{f.cond_endif}</TableCell>
                            <TableCell className="text-right">{f.cond_nest_block}</TableCell>
                            <TableCell className="text-right">{f.def_hit_count}</TableCell>
                            <TableCell className="text-right">{f.macro_hit_count}</TableCell>
                            <TableCell className="text-right">{Number(f.time_delta).toFixed(4)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="included">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Include File</TableHead>
                          <TableHead>Source Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionDetail.includedFiles?.map((inc: any) => (
                          <TableRow key={inc.id}>
                            <TableCell className="font-mono text-xs">{inc.include_file_name}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{inc.source_line_ref}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="defines">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-1">
                      {sessionDetail.defineVars?.map((dv: any) => (
                        <DefineVarRow key={dv.id} dv={dv} />
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DefineVarRow({ dv }: { dv: any }) {
  const [open, setOpen] = useState(false);

  const typeColor: Record<string, string> = {
    DEFINITION: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    MACRO: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    CONDITIONAL: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    CONTROL: 'bg-green-500/10 text-green-400 border-green-500/30',
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors text-left w-full">
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="font-mono text-sm font-medium text-foreground">{dv.var_name}</span>
          <Badge className={`text-[10px] ${typeColor[dv.first_hit_var_type] || ''}`} variant="outline">
            {dv.first_hit_var_type}
          </Badge>
          {dv.cond_ord_depth != null && (
            <Badge variant="outline" className="text-[10px]">
              Depth: {dv.cond_ord_depth}
            </Badge>
          )}
          {dv.cond_ord_dir && (
            <Badge variant="secondary" className="text-[10px]">
              #{dv.cond_ord_dir}
            </Badge>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">{dv.first_hit_slnr}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 pl-4 border-l border-border space-y-2 py-2">
          {/* Scope & Conditional Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Scope:</span> <span className="text-foreground">{dv.first_hit_src_scope}</span></div>
            <div><span className="text-muted-foreground">Source Ref:</span> <span className="font-mono text-foreground">{dv.first_hit_slnr}</span></div>
            {dv.cond_ord_dir && (
              <>
                <div><span className="text-muted-foreground">Cond Dir:</span> <span className="text-foreground">#{dv.cond_ord_dir}</span></div>
                <div><span className="text-muted-foreground">Cond Ref:</span> <span className="font-mono text-foreground">{dv.cond_ord_slnr}</span></div>
              </>
            )}
          </div>

          {/* Relations */}
          {(dv.parents?.length > 0 || dv.siblings?.length > 0 || dv.children?.length > 0) && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> Relations
              </p>
              {dv.parents?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground">Parents:</span>
                  {dv.parents.map((p: string) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
                </div>
              )}
              {dv.siblings?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground">Siblings:</span>
                  {dv.siblings.map((s: string) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                </div>
              )}
              {dv.children?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground">Children:</span>
                  {dv.children.map((c: string) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                </div>
              )}
            </div>
          )}

          {/* All Hits */}
          {dv.allHits?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">All Hits ({dv.allHits.length})</p>
              {dv.allHits.map((h: any, i: number) => (
                <div key={i} className="text-xs text-foreground">
                  {h.hit_mode} | {h.var_type} | depth:{h.depth} | {h.hit_slnr}
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
