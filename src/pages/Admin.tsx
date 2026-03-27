import { useState, useEffect } from "react";
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
import { Employee, CodeEntry, Category, CATEGORY_LABELS } from "@/lib/types";
import {
  getEmployees,
  saveEmployees,
  getCodes,
  saveCodes,
  getLocations,
  saveLocations,
  getSubmissions,
} from "@/lib/store";
import { Plus, Trash2, Eye, EyeOff, Lock, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

const ADMIN_PASSWORD = "capstone2026";

const CATEGORIES: Category[] = [
  "due_diligence",
  "portfolio_engagements",
  "functional_coes",
  "other",
];

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [newLocation, setNewLocation] = useState("");

  // Editing employee inline
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editingEmp, setEditingEmp] = useState({ name: "", rate: "", homeState: "" });

  useEffect(() => {
    if (authenticated) {
      setEmployees(getEmployees());
      setCodes(getCodes());
      setLocations(getLocations());
    }
  }, [authenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPassword("");
    } else {
      toast.error("Incorrect password");
    }
  };

  // Employee management
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpRate, setNewEmpRate] = useState("");
  const [newEmpState, setNewEmpState] = useState("");

  const addEmployee = () => {
    if (!newEmpName.trim()) return;
    const updated = [
      ...employees,
      {
        id: crypto.randomUUID(),
        name: newEmpName.trim(),
        rate: parseFloat(newEmpRate) || 0,
        homeState: newEmpState || "NY",
        active: true,
      },
    ];
    setEmployees(updated);
    saveEmployees(updated);
    setNewEmpName("");
    setNewEmpRate("");
    setNewEmpState("");
    toast.success("Employee added");
  };

  const toggleEmployee = (id: string) => {
    const updated = employees.map((e) =>
      e.id === id ? { ...e, active: !e.active } : e
    );
    setEmployees(updated);
    saveEmployees(updated);
  };

  const startEditEmp = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEditingEmp({ name: emp.name, rate: emp.rate.toString(), homeState: emp.homeState });
  };

  const saveEmp = (id: string) => {
    const updated = employees.map((e) =>
      e.id === id ? { ...e, name: editingEmp.name.trim() || e.name, rate: parseFloat(editingEmp.rate) || 0, homeState: editingEmp.homeState.trim() || e.homeState } : e
    );
    setEmployees(updated);
    saveEmployees(updated);
    setEditingEmpId(null);
    toast.success("Employee updated");
  };

  const cancelEditEmp = () => setEditingEmpId(null);

  // Code management
  const [newCodeLabel, setNewCodeLabel] = useState("");
  const [newCodeCode, setNewCodeCode] = useState("");
  const [newCodeCat, setNewCodeCat] = useState<Category>("due_diligence");

  const addCode = () => {
    if (!newCodeLabel.trim() || !newCodeCode.trim()) return;
    const updated = [
      ...codes,
      {
        id: crypto.randomUUID(),
        label: newCodeLabel.trim(),
        code: newCodeCode.trim(),
        category: newCodeCat,
        active: true,
      },
    ];
    setCodes(updated);
    saveCodes(updated);
    setNewCodeLabel("");
    setNewCodeCode("");
    toast.success("Code added");
  };

  const toggleCode = (id: string) => {
    const updated = codes.map((c) =>
      c.id === id ? { ...c, active: !c.active } : c
    );
    setCodes(updated);
    saveCodes(updated);
  };

  const addLocation = () => {
    if (!newLocation.trim() || locations.includes(newLocation.trim())) return;
    const updated = [...locations, newLocation.trim()];
    setLocations(updated);
    saveLocations(updated);
    setNewLocation("");
    toast.success("Location added");
  };

  const removeLocation = (loc: string) => {
    const updated = locations.filter((l) => l !== loc);
    setLocations(updated);
    saveLocations(updated);
  };

  const submissions = getSubmissions();

  if (!authenticated) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-sm space-y-6 pt-20">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
              <Lock className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
            <p className="text-center text-sm text-muted-foreground">
              Enter the admin password to manage employees, codes, and submissions.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Admin Panel
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAuthenticated(false)}
            className="gap-1 text-xs"
          >
            <Lock className="h-3 w-3" /> Lock
          </Button>
        </div>

        <Tabs defaultValue="employees">
          <TabsList>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="codes">Codes</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="submissions">Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-4">
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
                {employees.map((emp) => {
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
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="codes" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Label (e.g. Project Alpha)"
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
              <Button onClick={addCode} className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id} className={!code.active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{code.label}</TableCell>
                    <TableCell className="font-mono text-xs">{code.code}</TableCell>
                    <TableCell>{CATEGORY_LABELS[code.category]}</TableCell>
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
                      <button
                        onClick={() => toggleCode(code.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {code.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="State (e.g. FL)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-40"
              />
              <Button onClick={addLocation} className="gap-1">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
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
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            {submissions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No submissions yet.
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
                  {submissions.map((sub) => {
                    const emp = getEmployees().find((e) => e.id === sub.employeeId);
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
