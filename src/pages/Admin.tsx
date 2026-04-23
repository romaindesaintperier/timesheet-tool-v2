import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Employee, CodeEntry, Category, CATEGORY_LABELS, WeeklySubmission } from "@/lib/types";
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  fetchCodes,
  createCode,
  updateCode,
  fetchLocations,
  createLocation,
  deleteLocation,
  fetchSubmissions,
} from "@/lib/api";
import { Plus, Trash2, Eye, EyeOff, Pencil, Check, X, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: Category[] = [
  "due_diligence",
  "portfolio_engagements",
  "functional_coes",
  "other",
];

/** Live search input — name only / flexible. */
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}

export default function Admin() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<WeeklySubmission[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [loading, setLoading] = useState(true);

  // Search state per tab
  const [empSearch, setEmpSearch] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [locSearch, setLocSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");

  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editingEmp, setEditingEmp] = useState({ name: "", rate: "", homeState: "" });

  // Code edit state
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState<{ label: string; category: Category }>({ label: "", category: "due_diligence" });

  useEffect(() => {
    Promise.all([
      fetchEmployees().then(setEmployees),
      fetchCodes().then(setCodes),
      fetchLocations().then(setLocations),
      fetchSubmissions().then(setSubmissions),
    ])
      .catch(() => toast.error("Failed to load admin data"))
      .finally(() => setLoading(false));
  }, []);

  // ── Employees ──
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRate, setNewEmpRate] = useState("");
  const [newEmpState, setNewEmpState] = useState("");

  const filteredEmployees = useMemo(
    () =>
      empSearch.trim()
        ? employees.filter((e) => e.name.toLowerCase().includes(empSearch.toLowerCase()))
        : employees,
    [empSearch, employees]
  );

  const addEmployee = async () => {
    if (!newEmpName.trim()) return;
    try {
      const emp = await createEmployee({
        name: newEmpName.trim(),
        rate: parseFloat(newEmpRate) || 0,
        homeState: newEmpState || "NY",
        active: true,
      });
      setEmployees((prev) => [...prev, emp]);
      setNewEmpName("");
      setNewEmpRate("");
      setNewEmpState("");
      toast.success("Employee added");
    } catch {
      toast.error("Failed to add employee");
    }
  };

  const toggleEmployee = async (id: string) => {
    const emp = employees.find((e) => e.id === id);
    if (!emp) return;
    try {
      await updateEmployee(id, { active: !emp.active });
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e))
      );
    } catch {
      toast.error("Failed to update employee");
    }
  };

  const startEditEmp = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEditingEmp({ name: emp.name, rate: emp.rate.toString(), homeState: emp.homeState });
  };

  const saveEmp = async (id: string) => {
    try {
      await updateEmployee(id, {
        name: editingEmp.name.trim(),
        rate: parseFloat(editingEmp.rate) || 0,
        homeState: editingEmp.homeState.trim(),
      });
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, name: editingEmp.name.trim() || e.name, rate: parseFloat(editingEmp.rate) || 0, homeState: editingEmp.homeState.trim() || e.homeState }
            : e
        )
      );
      setEditingEmpId(null);
      toast.success("Employee updated");
    } catch {
      toast.error("Failed to update employee");
    }
  };

  const cancelEditEmp = () => setEditingEmpId(null);

  // ── Codes ──
  const [newCodeLabel, setNewCodeLabel] = useState("");
  const [newCodeCode, setNewCodeCode] = useState("");
  const [newCodeCat, setNewCodeCat] = useState<Category>("due_diligence");

  const filteredCodes = useMemo(
    () =>
      codeSearch.trim()
        ? codes.filter((c) => c.label.toLowerCase().includes(codeSearch.toLowerCase()))
        : codes,
    [codeSearch, codes]
  );

  /** Case-insensitive uniqueness check on code name (label). */
  const isLabelTaken = (label: string, ignoreId?: string) =>
    codes.some(
      (c) => c.id !== ignoreId && c.label.trim().toLowerCase() === label.trim().toLowerCase()
    );

  const addCodeHandler = async () => {
    const label = newCodeLabel.trim();
    if (!label || !newCodeCode.trim()) return;
    if (isLabelTaken(label)) {
      toast.error("A code with that name already exists.");
      return;
    }
    try {
      const code = await createCode({
        label,
        code: newCodeCode.trim(),
        category: newCodeCat,
        active: true,
      });
      setCodes((prev) => [...prev, code]);
      setNewCodeLabel("");
      setNewCodeCode("");
      toast.success("Code added");
    } catch {
      toast.error("Failed to add code");
    }
  };

  const toggleCode = async (id: string) => {
    const code = codes.find((c) => c.id === id);
    if (!code) return;
    try {
      await updateCode(id, { active: !code.active });
      setCodes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
      );
    } catch {
      toast.error("Failed to update code");
    }
  };

  const startEditCode = (code: CodeEntry) => {
    setEditingCodeId(code.id);
    setEditingCode({ label: code.label, category: code.category });
  };

  const cancelEditCode = () => setEditingCodeId(null);

  const saveCode = async (id: string) => {
    const label = editingCode.label.trim();
    if (!label) {
      toast.error("Code name cannot be empty.");
      return;
    }
    if (isLabelTaken(label, id)) {
      toast.error("A code with that name already exists.");
      return;
    }
    try {
      // Editing label updates the row in place; all submission rows reference
      // codes by id, so historical references automatically reflect the new name.
      await updateCode(id, { label, category: editingCode.category });
      setCodes((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, label, category: editingCode.category } : c
        )
      );
      setEditingCodeId(null);
      toast.success("Code updated");
    } catch {
      toast.error("Failed to update code");
    }
  };

  // ── Locations ──
  const filteredLocations = useMemo(
    () =>
      locSearch.trim()
        ? locations.filter((l) => l.toLowerCase().includes(locSearch.toLowerCase()))
        : locations,
    [locSearch, locations]
  );

  const addLocationHandler = async () => {
    if (!newLocation.trim() || locations.includes(newLocation.trim())) return;
    try {
      await createLocation(newLocation.trim());
      setLocations((prev) => [...prev, newLocation.trim()]);
      setNewLocation("");
      toast.success("Location added");
    } catch {
      toast.error("Failed to add location");
    }
  };

  const removeLocation = async (loc: string) => {
    try {
      await deleteLocation(loc);
      setLocations((prev) => prev.filter((l) => l !== loc));
    } catch {
      toast.error("Failed to remove location");
    }
  };

  // ── Submissions (flexible search: employee name, week ending, status) ──
  const filteredSubmissions = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter((sub) => {
      const emp = employees.find((e) => e.id === sub.employeeId);
      const empName = emp?.name.toLowerCase() || "";
      return (
        empName.includes(q) ||
        sub.weekEnding.toLowerCase().includes(q) ||
        sub.status.toLowerCase().includes(q)
      );
    });
  }, [subSearch, submissions, employees]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Admin Panel
        </h1>

        <Tabs defaultValue="employees">
          <TabsList>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="codes">Codes</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-4">
            <SearchBar value={empSearch} onChange={setEmpSearch} placeholder="Search by name…" />
            <div className="flex gap-2">
              <Input
                placeholder="Name"
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
              />
              <Input
                placeholder="Rate ($/hr)"
                type="number"
                value={newEmpRate}
                onChange={(e) => setNewEmpRate(e.target.value)}
                className="w-28"
              />
              <Input
                placeholder="State"
                value={newEmpState}
                onChange={(e) => setNewEmpState(e.target.value)}
                className="w-20"
              />
              <Button onClick={addEmployee} className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Home State</TableHead>
                   <TableHead>Rate ($/hr)</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const isEditing = editingEmpId === emp.id;
                  const handleKey = (e: React.KeyboardEvent) => {
                    if (e.key === "Enter") saveEmp(emp.id);
                    if (e.key === "Escape") cancelEditEmp();
                  };
                  return (
                    <TableRow key={emp.id} className={!emp.active ? "opacity-50" : ""}>
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <Input value={editingEmp.name} onChange={(e) => setEditingEmp(p => ({ ...p, name: e.target.value }))} onKeyDown={handleKey} className="h-7 text-xs" autoFocus />
                        ) : emp.name}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input value={editingEmp.homeState} onChange={(e) => setEditingEmp(p => ({ ...p, homeState: e.target.value }))} onKeyDown={handleKey} className="h-7 w-20 text-xs" />
                        ) : emp.homeState}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input type="number" value={editingEmp.rate} onChange={(e) => setEditingEmp(p => ({ ...p, rate: e.target.value }))} onKeyDown={handleKey} className="h-7 w-24 text-xs" />
                        ) : `$${emp.rate}`}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${emp.active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                          {emp.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveEmp(emp.id)} className="text-primary hover:opacity-80"><Check className="h-4 w-4" /></button>
                              <button onClick={cancelEditEmp} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEditEmp(emp)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => toggleEmployee(emp.id)} className="text-muted-foreground hover:text-foreground">
                                {emp.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      No employees match "{empSearch}"
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="codes" className="space-y-4">
            <SearchBar value={codeSearch} onChange={setCodeSearch} placeholder="Search by name…" />
            <div className="flex gap-2">
              <Input
                placeholder="Name (e.g. Project Alpha)"
                value={newCodeLabel}
                onChange={(e) => setNewCodeLabel(e.target.value)}
              />
              <Input
                placeholder="Code"
                value={newCodeCode}
                onChange={(e) => setNewCodeCode(e.target.value)}
                className="w-28"
              />
              <Select value={newCodeCat} onValueChange={(v) => setNewCodeCat(v as Category)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addCodeHandler} className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.map((code) => {
                  const isEditing = editingCodeId === code.id;
                  const handleKey = (e: React.KeyboardEvent) => {
                    if (e.key === "Enter") saveCode(code.id);
                    if (e.key === "Escape") cancelEditCode();
                  };
                  return (
                    <TableRow key={code.id} className={!code.active ? "opacity-50" : ""}>
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <Input
                            value={editingCode.label}
                            onChange={(e) => setEditingCode((p) => ({ ...p, label: e.target.value }))}
                            onKeyDown={handleKey}
                            className="h-7 text-xs"
                            autoFocus
                          />
                        ) : (
                          code.label
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{code.code}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select
                            value={editingCode.category}
                            onValueChange={(v) => setEditingCode((p) => ({ ...p, category: v as Category }))}
                          >
                            <SelectTrigger className="h-7 w-44 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {CATEGORY_LABELS[c]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          CATEGORY_LABELS[code.category]
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            code.active
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {code.active ? "Active" : "Retired"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => saveCode(code.id)} className="text-primary hover:opacity-80"><Check className="h-4 w-4" /></button>
                              <button onClick={cancelEditCode} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEditCode(code)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => toggleCode(code.id)} className="text-muted-foreground hover:text-foreground">
                                {code.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredCodes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      No codes match "{codeSearch}"
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <SearchBar value={locSearch} onChange={setLocSearch} placeholder="Search by name…" />
            <div className="flex gap-2">
              <Input
                placeholder="State (e.g. FL)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-40"
              />
              <Button onClick={addLocationHandler} className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredLocations.map((loc) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
                >
                  {loc}
                  <button
                    onClick={() => removeLocation(loc)}
                    className="ml-1 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {filteredLocations.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">
                  No locations match "{locSearch}"
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            <SearchBar
              value={subSearch}
              onChange={setSubSearch}
              placeholder="Search by employee, week, or status…"
            />
            {filteredSubmissions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {subSearch ? `No submissions match "${subSearch}"` : "No submissions yet."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Week Ending</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((sub) => {
                    const emp = employees.find((e) => e.id === sub.employeeId);
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {emp?.name || "Unknown"}
                        </TableCell>
                        <TableCell>{sub.weekEnding}</TableCell>
                        <TableCell>{sub.rows.length}</TableCell>
                        <TableCell>
                          {sub.rows.reduce((s, r) => s + r.hours, 0)}h
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(sub.submittedAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
