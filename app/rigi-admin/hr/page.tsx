"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  Banknote,
  CalendarCheck,
  CheckCircle2,
  Pencil,
  Plane,
  Plus,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import {
  AdminCard,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Field,
  FilterSelect,
  KpiCard,
  PageHeader,
  SelectInput,
  SlideOver,
  StatusPill,
  Tabs,
  TextArea,
  TextInput,
  type Column,
  type TabDef,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useOptionalAdminSession } from "@/components/admin/session";
import {
  deleteRow,
  insertRow,
  logAudit,
  updateRow,
  useDb,
  withLatency,
} from "@/lib/mock/store";
import type { Applicant, Attendance, Employee, LeaveRequest, PayrollRun } from "@/lib/mock/types";
import { hasCapability } from "@/lib/permissions";
import { formatGHS } from "@/lib/utils";

/* ------------------------------------------------------------- helpers */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function num(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hoursBetween(clockIn: string, clockOut: string): number | null {
  if (!clockIn || !clockOut) return null;
  const [inHour, inMinute] = clockIn.split(":").map(Number);
  const [outHour, outMinute] = clockOut.split(":").map(Number);
  if ([inHour, inMinute, outHour, outMinute].some((part) => !Number.isFinite(part))) return null;
  const minutes = outHour * 60 + outMinute - (inHour * 60 + inMinute);
  if (minutes <= 0) return null;
  return Math.round((minutes / 60) * 10) / 10;
}

function daysBetween(from: string, to: string): string {
  if (!from || !to) return "";
  const diff = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(diff)) return "";
  return String(Math.max(1, Math.round(diff / 86_400_000) + 1));
}

const SSNIT_RATE = 0.055;
const PAYE_RATE = 0.12;

const DEPARTMENTS = [
  "Operations",
  "Fleet",
  "Sales",
  "Finance",
  "People",
  "Customer Service",
] as const;
const CONTRACTS = ["full_time", "part_time", "contract"] as const;
const ATTENDANCE_STATUSES = ["present", "late", "absent", "leave"] as const;
const LEAVE_TYPES = ["annual", "sick", "unpaid", "maternity"] as const;
const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const;
const APPLICANT_STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;

interface EmployeeFormState {
  staffNo: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  contract: string;
  startDate: string;
  grossMonthly: string;
  allowances: string;
  emergencyName: string;
  emergencyPhone: string;
  active: boolean;
}

function emptyEmployee(staffNo: string): EmployeeFormState {
  return {
    staffNo,
    name: "",
    email: "",
    phone: "",
    department: "Operations",
    jobTitle: "",
    contract: "full_time",
    startDate: todayIso(),
    grossMonthly: "",
    allowances: "",
    emergencyName: "",
    emergencyPhone: "",
    active: true,
  };
}

interface AttendanceFormState {
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hours: string;
  status: string;
}

function emptyAttendance(employeeId: string): AttendanceFormState {
  return {
    employeeId,
    date: todayIso(),
    clockIn: "08:00",
    clockOut: "17:00",
    hours: "9",
    status: "present",
  };
}

interface LeaveFormState {
  employeeId: string;
  type: string;
  from: string;
  to: string;
  days: string;
  reason: string;
}

function emptyLeave(employeeId: string): LeaveFormState {
  return { employeeId, type: "annual", from: todayIso(), to: todayIso(), days: "1", reason: "" };
}

interface ApplicantFormState {
  name: string;
  role: string;
  email: string;
  stage: string;
  appliedAt: string;
  rating: string;
}

function emptyApplicant(): ApplicantFormState {
  return { name: "", role: "", email: "", stage: "applied", appliedAt: todayIso(), rating: "3" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------- page */

export default function AdminHrPage() {
  const db = useDb();
  const admin = useOptionalAdminSession();
  const { toast } = useToast();

  const actorName = admin?.session.name ?? "System";
  const role = admin?.role;
  const canDelete = role ? hasCapability(role, "delete_records") : false;
  const canManagePayroll = role ? hasCapability(role, "manage_payroll") : false;
  const canApproveLeave = canManagePayroll || role === "manager";

  const [tab, setTab] = useState("employees");
  const [saving, setSaving] = useState(false);

  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");

  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(() => emptyEmployee(""));
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceFormState>(() => emptyAttendance(""));
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState<LeaveFormState>(() => emptyLeave(""));
  const [applicantOpen, setApplicantOpen] = useState(false);
  const [applicantForm, setApplicantForm] = useState<ApplicantFormState>(() => emptyApplicant());

  const [runOpen, setRunOpen] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState("");
  const [viewingRun, setViewingRun] = useState<PayrollRun | null>(null);

  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    run: () => void;
  } | null>(null);

  /* --------------------------------------------------------- lookups */

  const employeeName = (id: string) =>
    db.employees.find((employee) => employee.id === id)?.name ?? "—";

  const nextStaffNo = () => {
    const max = db.employees.reduce((acc, employee) => {
      const parsed = Number(employee.staffNo.replace(/\D/g, ""));
      return Number.isFinite(parsed) ? Math.max(acc, parsed) : acc;
    }, 100);
    return `RX-${max + 1}`;
  };

  const currentPeriodLabel = new Date().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  /* ---------------------------------------------------------- metrics */

  const activeEmployees = useMemo(
    () => db.employees.filter((employee) => employee.active),
    [db.employees]
  );

  const metrics = useMemo(() => {
    const today = todayIso();
    const presentToday = db.attendance.filter(
      (record) => record.date === today && record.status === "present"
    );
    const pendingLeave = db.leaveRequests.filter((request) => request.status === "pending");
    const currentPeriod = new Date().toISOString().slice(0, 7);
    const thisMonthRun = db.payrollRuns.find((run) => run.period === currentPeriod);
    const payrollCost = thisMonthRun
      ? thisMonthRun.gross
      : activeEmployees.reduce(
          (sum, employee) => sum + employee.grossMonthly + employee.allowances,
          0
        );
    return { presentToday, pendingLeave, payrollCost, thisMonthRun };
  }, [db.attendance, db.leaveRequests, db.payrollRuns, activeEmployees]);

  const payrollPreview = useMemo(() => {
    const gross = activeEmployees.reduce(
      (sum, employee) => sum + employee.grossMonthly + employee.allowances,
      0
    );
    const ssnit = Math.round(gross * SSNIT_RATE);
    const paye = Math.round((gross - ssnit) * PAYE_RATE);
    const net = gross - ssnit - paye;
    return { gross, ssnit, paye, net };
  }, [activeEmployees]);

  const tabs: TabDef[] = [
    { id: "employees", label: "Employees", count: db.employees.length },
    { id: "attendance", label: "Attendance" },
    { id: "leave", label: "Leave", count: metrics.pendingLeave.length },
    { id: "payroll", label: "Payroll", count: db.payrollRuns.length },
    { id: "recruitment", label: "Recruitment", count: db.applicants.length },
  ];

  /* ------------------------------------------------------- employees */

  const employeeColumns: Column<Employee>[] = [
    {
      key: "staffNo",
      header: "Staff no",
      render: (employee) => <span className="font-medium text-ink">{employee.staffNo}</span>,
      value: (employee) => employee.staffNo,
    },
    { key: "name", header: "Name", value: (employee) => employee.name },
    {
      key: "department",
      header: "Department",
      value: (employee) => employee.department,
      hideBelow: "md",
    },
    { key: "jobTitle", header: "Job title", value: (employee) => employee.jobTitle, hideBelow: "lg" },
    {
      key: "contract",
      header: "Contract",
      render: (employee) => <StatusPill status={employee.contract} />,
      value: (employee) => employee.contract,
      hideBelow: "sm",
    },
    { key: "startDate", header: "Start date", value: (employee) => employee.startDate, hideBelow: "lg" },
    {
      key: "grossMonthly",
      header: "Gross monthly",
      align: "right",
      render: (employee) => formatGHS(employee.grossMonthly),
      value: (employee) => employee.grossMonthly,
    },
    {
      key: "allowances",
      header: "Allowances",
      align: "right",
      render: (employee) => formatGHS(employee.allowances),
      value: (employee) => employee.allowances,
      hideBelow: "lg",
    },
    {
      key: "active",
      header: "Active",
      render: (employee) => (
        <StatusPill
          status={employee.active ? "active" : "inactive"}
          label={employee.active ? "Active" : "Inactive"}
        />
      ),
      value: (employee) => (employee.active ? "Active" : "Inactive"),
    },
  ];

  const openNewEmployee = () => {
    setEditingEmployeeId(null);
    setEmployeeForm(emptyEmployee(nextStaffNo()));
    setEmployeeOpen(true);
  };

  const openEditEmployee = (employee: Employee) => {
    setEditingEmployeeId(employee.id);
    setEmployeeForm({
      staffNo: employee.staffNo,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      jobTitle: employee.jobTitle,
      contract: employee.contract,
      startDate: employee.startDate,
      grossMonthly: String(employee.grossMonthly),
      allowances: String(employee.allowances),
      emergencyName: employee.emergencyName,
      emergencyPhone: employee.emergencyPhone,
      active: employee.active,
    });
    setEmployeeOpen(true);
  };

  const saveEmployee = async () => {
    if (!employeeForm.name.trim()) {
      toast({ title: "Add a name", description: "An employee needs a full name.", variant: "error" });
      return;
    }
    if (num(employeeForm.grossMonthly) <= 0) {
      toast({ title: "Enter a gross salary", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      staffNo: employeeForm.staffNo.trim() || nextStaffNo(),
      name: employeeForm.name.trim(),
      email: employeeForm.email.trim(),
      phone: employeeForm.phone.trim(),
      department: employeeForm.department,
      jobTitle: employeeForm.jobTitle.trim(),
      contract: employeeForm.contract as Employee["contract"],
      startDate: employeeForm.startDate || todayIso(),
      grossMonthly: num(employeeForm.grossMonthly),
      allowances: num(employeeForm.allowances),
      emergencyName: employeeForm.emergencyName.trim(),
      emergencyPhone: employeeForm.emergencyPhone.trim(),
      active: employeeForm.active,
    };
    if (editingEmployeeId) {
      updateRow("employees", editingEmployeeId, payload);
    } else {
      insertRow("employees", payload);
    }
    logAudit({
      actorName,
      action: editingEmployeeId ? "updated" : "created",
      entity: "Employee",
      entityId: payload.staffNo,
      detail: `${editingEmployeeId ? "Updated" : "Added"} employee ${payload.name}`,
    });
    setSaving(false);
    setEmployeeOpen(false);
    toast({
      title: editingEmployeeId ? "Employee updated" : "Employee added",
      description: payload.name,
      variant: "success",
    });
  };

  const deleteEmployee = async (employee: Employee) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("employees", employee.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Employee",
      entityId: employee.staffNo,
      detail: `Deleted employee ${employee.name}`,
    });
    setSaving(false);
    toast({ title: "Employee deleted", variant: "success" });
  };

  /* ------------------------------------------------------ attendance */

  const attendanceRows = useMemo(
    () =>
      db.attendance.map((record) => ({
        id: record.id,
        record,
        employeeName:
          db.employees.find((employee) => employee.id === record.employeeId)?.name ?? "—",
      })),
    [db.attendance, db.employees]
  );

  const filteredAttendance = useMemo(
    () =>
      attendanceRows.filter(
        (row) => attendanceStatusFilter === "all" || row.record.status === attendanceStatusFilter
      ),
    [attendanceRows, attendanceStatusFilter]
  );

  const attendanceColumns: Column<(typeof attendanceRows)[number]>[] = [
    {
      key: "employee",
      header: "Employee",
      render: (row) => <span className="font-medium text-ink">{row.employeeName}</span>,
      value: (row) => row.employeeName,
    },
    { key: "date", header: "Date", value: (row) => row.record.date },
    {
      key: "clockIn",
      header: "Clock in",
      render: (row) => row.record.clockIn || "—",
      value: (row) => row.record.clockIn,
      hideBelow: "md",
    },
    {
      key: "clockOut",
      header: "Clock out",
      render: (row) => row.record.clockOut ?? "—",
      value: (row) => row.record.clockOut ?? "",
      hideBelow: "md",
    },
    {
      key: "hours",
      header: "Hours",
      align: "right",
      render: (row) => `${row.record.hours} h`,
      value: (row) => row.record.hours,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill status={row.record.status} />,
      value: (row) => row.record.status,
    },
  ];

  const openNewAttendance = () => {
    setAttendanceForm(emptyAttendance(db.employees[0]?.id ?? ""));
    setAttendanceOpen(true);
  };

  const saveAttendance = async () => {
    if (!attendanceForm.employeeId) {
      toast({ title: "Select an employee", variant: "error" });
      return;
    }
    const computed = hoursBetween(attendanceForm.clockIn, attendanceForm.clockOut);
    const hours = computed ?? num(attendanceForm.hours);
    setSaving(true);
    await withLatency(null);
    insertRow("attendance", {
      employeeId: attendanceForm.employeeId,
      date: attendanceForm.date || todayIso(),
      clockIn: attendanceForm.clockIn,
      clockOut: attendanceForm.clockOut || null,
      hours,
      status: attendanceForm.status as Attendance["status"],
    });
    logAudit({
      actorName,
      action: "created",
      entity: "Attendance",
      entityId: attendanceForm.employeeId,
      detail: `Recorded attendance for ${employeeName(attendanceForm.employeeId)}`,
    });
    setSaving(false);
    setAttendanceOpen(false);
    toast({ title: "Attendance recorded", variant: "success" });
  };

  const deleteAttendance = async (row: (typeof attendanceRows)[number]) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("attendance", row.record.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Attendance",
      entityId: row.record.id,
      detail: `Deleted attendance for ${row.employeeName}`,
    });
    setSaving(false);
    toast({ title: "Attendance deleted", variant: "success" });
  };

  /* ----------------------------------------------------------- leave */

  const leaveRows = useMemo(
    () =>
      db.leaveRequests.map((request) => ({
        id: request.id,
        request,
        employeeName:
          db.employees.find((employee) => employee.id === request.employeeId)?.name ?? "—",
      })),
    [db.leaveRequests, db.employees]
  );

  const filteredLeave = useMemo(
    () =>
      leaveRows.filter(
        (row) =>
          (leaveStatusFilter === "all" || row.request.status === leaveStatusFilter) &&
          (leaveTypeFilter === "all" || row.request.type === leaveTypeFilter)
      ),
    [leaveRows, leaveStatusFilter, leaveTypeFilter]
  );

  const leaveColumns: Column<(typeof leaveRows)[number]>[] = [
    {
      key: "employee",
      header: "Employee",
      render: (row) => <span className="font-medium text-ink">{row.employeeName}</span>,
      value: (row) => row.employeeName,
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <StatusPill status={row.request.type} />,
      value: (row) => row.request.type,
    },
    { key: "from", header: "From", value: (row) => row.request.from, hideBelow: "md" },
    { key: "to", header: "To", value: (row) => row.request.to, hideBelow: "md" },
    {
      key: "days",
      header: "Days",
      align: "right",
      value: (row) => row.request.days,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill status={row.request.status} />,
      value: (row) => row.request.status,
    },
    {
      key: "reason",
      header: "Reason",
      render: (row) => row.request.reason || "—",
      value: (row) => row.request.reason,
      hideBelow: "lg",
    },
  ];

  const openNewLeave = () => {
    setLeaveForm(emptyLeave(db.employees[0]?.id ?? ""));
    setLeaveOpen(true);
  };

  const saveLeave = async () => {
    if (!leaveForm.employeeId) {
      toast({ title: "Select an employee", variant: "error" });
      return;
    }
    const days = num(leaveForm.days) || Number(daysBetween(leaveForm.from, leaveForm.to)) || 1;
    setSaving(true);
    await withLatency(null);
    insertRow("leaveRequests", {
      employeeId: leaveForm.employeeId,
      type: leaveForm.type as LeaveRequest["type"],
      from: leaveForm.from || todayIso(),
      to: leaveForm.to || todayIso(),
      days,
      status: "pending",
      reason: leaveForm.reason.trim(),
    });
    logAudit({
      actorName,
      action: "created",
      entity: "Leave request",
      entityId: leaveForm.employeeId,
      detail: `Requested ${leaveForm.type} leave for ${employeeName(leaveForm.employeeId)}`,
    });
    setSaving(false);
    setLeaveOpen(false);
    toast({ title: "Leave requested", variant: "success" });
  };

  const setLeaveStatus = async (
    row: (typeof leaveRows)[number],
    status: LeaveRequest["status"]
  ) => {
    setSaving(true);
    await withLatency(null);
    updateRow("leaveRequests", row.request.id, { status });
    logAudit({
      actorName,
      action: "updated",
      entity: "Leave request",
      entityId: row.request.id,
      detail: `${status} leave for ${row.employeeName}`,
    });
    setSaving(false);
    toast({ title: `Leave ${status}`, description: row.employeeName, variant: "success" });
  };

  /* --------------------------------------------------------- payroll */

  const payrollColumns: Column<PayrollRun>[] = [
    {
      key: "period",
      header: "Period",
      render: (run) => <span className="font-medium text-ink">{run.period}</span>,
      value: (run) => run.period,
    },
    {
      key: "employees",
      header: "Employees",
      align: "right",
      value: (run) => run.employees,
      hideBelow: "md",
    },
    {
      key: "gross",
      header: "Gross",
      align: "right",
      render: (run) => formatGHS(run.gross),
      value: (run) => run.gross,
    },
    {
      key: "ssnit",
      header: "SSNIT",
      align: "right",
      render: (run) => formatGHS(run.ssnit),
      value: (run) => run.ssnit,
      hideBelow: "lg",
    },
    {
      key: "paye",
      header: "PAYE",
      align: "right",
      render: (run) => formatGHS(run.paye),
      value: (run) => run.paye,
      hideBelow: "lg",
    },
    {
      key: "net",
      header: "Net",
      align: "right",
      render: (run) => <span className="font-medium text-ink">{formatGHS(run.net)}</span>,
      value: (run) => run.net,
    },
    {
      key: "status",
      header: "Status",
      render: (run) => <StatusPill status={run.status} />,
      value: (run) => run.status,
    },
  ];

  const openRunPayroll = () => {
    setPayrollPeriod(currentPeriodLabel);
    setRunOpen(true);
  };

  const savePayroll = async () => {
    const period = payrollPeriod.trim();
    if (!period) {
      toast({ title: "Enter a period", description: "e.g. October 2026", variant: "error" });
      return;
    }
    if (!activeEmployees.length) {
      toast({ title: "No active employees", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const run = insertRow("payrollRuns", {
      period,
      gross: payrollPreview.gross,
      ssnit: payrollPreview.ssnit,
      paye: payrollPreview.paye,
      net: payrollPreview.net,
      status: "approved",
      employees: activeEmployees.length,
    });
    for (const employee of activeEmployees) {
      const employeeGross = employee.grossMonthly + employee.allowances;
      const ssnit = Math.round(employeeGross * SSNIT_RATE);
      const paye = Math.round((employeeGross - ssnit) * PAYE_RATE);
      insertRow("payslips", {
        payrollRunId: run.id,
        employeeId: employee.id,
        basic: employee.grossMonthly,
        allowances: employee.allowances,
        ssnit,
        paye,
        otherDeductions: 0,
        net: employeeGross - ssnit - paye,
      });
    }
    logAudit({
      actorName,
      action: "created",
      entity: "Payroll run",
      entityId: run.id,
      detail: `Ran payroll for ${period} (${activeEmployees.length} employees)`,
    });
    setSaving(false);
    setRunOpen(false);
    toast({
      title: "Payroll run approved",
      description: `${period} · ${activeEmployees.length} payslips`,
      variant: "success",
    });
  };

  const markRunPaid = async (run: PayrollRun) => {
    setSaving(true);
    await withLatency(null);
    updateRow("payrollRuns", run.id, { status: "paid" });
    logAudit({
      actorName,
      action: "updated",
      entity: "Payroll run",
      entityId: run.id,
      detail: `Payroll for ${run.period} marked paid`,
    });
    setSaving(false);
    toast({ title: "Payroll marked paid", description: run.period, variant: "success" });
  };

  const runPayslips = useMemo(
    () =>
      viewingRun
        ? db.payslips
            .filter((payslip) => payslip.payrollRunId === viewingRun.id)
            .map((payslip) => ({
              payslip,
              employeeName:
                db.employees.find((employee) => employee.id === payslip.employeeId)?.name ?? "—",
            }))
        : [],
    [db.payslips, db.employees, viewingRun]
  );

  /* ----------------------------------------------------- recruitment */

  const applicantColumns: Column<Applicant>[] = [
    {
      key: "name",
      header: "Name",
      render: (applicant) => <span className="font-medium text-ink">{applicant.name}</span>,
      value: (applicant) => applicant.name,
    },
    { key: "role", header: "Role", value: (applicant) => applicant.role },
    { key: "email", header: "Email", value: (applicant) => applicant.email, hideBelow: "md" },
    {
      key: "stage",
      header: "Stage",
      render: (applicant) => <StatusPill status={applicant.stage} />,
      value: (applicant) => applicant.stage,
    },
    {
      key: "appliedAt",
      header: "Applied",
      value: (applicant) => applicant.appliedAt,
      hideBelow: "lg",
    },
    {
      key: "rating",
      header: "Rating",
      align: "right",
      render: (applicant) => `${applicant.rating}/5`,
      value: (applicant) => applicant.rating,
    },
  ];

  const openNewApplicant = () => {
    setApplicantForm(emptyApplicant());
    setApplicantOpen(true);
  };

  const saveApplicant = async () => {
    if (!applicantForm.name.trim()) {
      toast({ title: "Add a name", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    insertRow("applicants", {
      name: applicantForm.name.trim(),
      role: applicantForm.role.trim() || "Rental agent",
      email: applicantForm.email.trim(),
      stage: applicantForm.stage as Applicant["stage"],
      appliedAt: applicantForm.appliedAt || todayIso(),
      rating: num(applicantForm.rating) || 3,
    });
    logAudit({
      actorName,
      action: "created",
      entity: "Applicant",
      entityId: applicantForm.name.trim(),
      detail: `Added applicant ${applicantForm.name.trim()}`,
    });
    setSaving(false);
    setApplicantOpen(false);
    toast({ title: "Applicant added", variant: "success" });
  };

  const setApplicantStage = async (applicant: Applicant, stage: Applicant["stage"]) => {
    setSaving(true);
    await withLatency(null);
    updateRow("applicants", applicant.id, { stage });
    logAudit({
      actorName,
      action: "updated",
      entity: "Applicant",
      entityId: applicant.id,
      detail: `${applicant.name} → ${stage}`,
    });
    setSaving(false);
    toast({ title: `Applicant ${stage}`, description: applicant.name, variant: "success" });
  };

  const deleteApplicant = async (applicant: Applicant) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("applicants", applicant.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Applicant",
      entityId: applicant.id,
      detail: `Deleted applicant ${applicant.name}`,
    });
    setSaving(false);
    toast({ title: "Applicant deleted", variant: "success" });
  };

  /* ------------------------------------------------------------ view */

  return (
    <>
      <PageHeader
        title="HR"
        description="People, attendance, leave, payroll and recruitment for the team."
        actions={
          tab === "payroll" && canManagePayroll ? (
            <Button size="sm" onClick={openRunPayroll}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Run payroll
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Headcount"
          value={String(activeEmployees.length)}
          sub={`${db.employees.length} employees on record`}
          icon={Users}
        />
        <KpiCard
          label="Present today"
          value={String(metrics.presentToday.length)}
          sub="Clocked in today"
          icon={CalendarCheck}
          tone="positive"
        />
        <KpiCard
          label="Pending leave"
          value={String(metrics.pendingLeave.length)}
          sub="Awaiting approval"
          icon={Plane}
          tone={metrics.pendingLeave.length ? "warning" : "neutral"}
        />
        <KpiCard
          label="Payroll cost this month"
          value={formatGHS(metrics.payrollCost)}
          sub={metrics.thisMonthRun ? `${metrics.thisMonthRun.period} run` : "Gross of active staff"}
          icon={Banknote}
        />
      </div>

      <div className="mt-6">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "employees" && (
        <DataTable<Employee>
          columns={employeeColumns}
          rows={db.employees}
          searchFields={(employee) =>
            `${employee.name} ${employee.email} ${employee.staffNo} ${employee.department}`
          }
          searchPlaceholder="Search name, email, staff no or department…"
          exportFilename="employees.csv"
          emptyTitle="No employees"
          emptyDescription="Add your first team member to get started."
          toolbar={
            <Button size="sm" onClick={openNewEmployee}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add employee
            </Button>
          }
          rowActions={(employee) => (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                aria-label={`Edit ${employee.name}`}
                onClick={() => openEditEmployee(employee)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${employee.name}`}
                  onClick={() =>
                    setConfirm({
                      title: "Delete employee",
                      description: `This permanently removes ${employee.name}.`,
                      run: () => void deleteEmployee(employee),
                    })
                  }
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {tab === "attendance" && (
        <DataTable<(typeof attendanceRows)[number]>
          columns={attendanceColumns}
          rows={filteredAttendance}
          searchFields={(row) => `${row.employeeName} ${row.record.date}`}
          searchPlaceholder="Search employee or date…"
          exportFilename="attendance.csv"
          initialSort={{ key: "date", dir: "desc" }}
          emptyTitle="No attendance records"
          emptyDescription="Record attendance to track who is on site."
          toolbar={
            <Button size="sm" onClick={openNewAttendance}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Record attendance
            </Button>
          }
          filters={
            <FilterSelect
              label="Status"
              value={attendanceStatusFilter}
              options={["all", ...ATTENDANCE_STATUSES]}
              onChange={setAttendanceStatusFilter}
            />
          }
          rowActions={(row) =>
            canDelete ? (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  aria-label={`Delete attendance for ${row.employeeName}`}
                  onClick={() =>
                    setConfirm({
                      title: "Delete attendance",
                      description: `This removes the ${row.record.date} record for ${row.employeeName}.`,
                      run: () => void deleteAttendance(row),
                    })
                  }
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null
          }
        />
      )}

      {tab === "leave" && (
        <DataTable<(typeof leaveRows)[number]>
          columns={leaveColumns}
          rows={filteredLeave}
          searchFields={(row) => `${row.employeeName} ${row.request.reason}`}
          searchPlaceholder="Search employee or reason…"
          exportFilename="leave-requests.csv"
          emptyTitle="No leave requests match"
          emptyDescription="Adjust the filters or request leave."
          toolbar={
            <Button size="sm" onClick={openNewLeave}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Request leave
            </Button>
          }
          filters={
            <>
              <FilterSelect
                label="Status"
                value={leaveStatusFilter}
                options={["all", ...LEAVE_STATUSES]}
                onChange={setLeaveStatusFilter}
              />
              <FilterSelect
                label="Type"
                value={leaveTypeFilter}
                options={["all", ...LEAVE_TYPES]}
                onChange={setLeaveTypeFilter}
              />
            </>
          }
          rowActions={(row) =>
            canApproveLeave ? (
              <div className="flex items-center justify-end gap-1">
                {row.request.status !== "approved" && (
                  <button
                    type="button"
                    aria-label={`Approve leave for ${row.employeeName}`}
                    disabled={saving}
                    onClick={() => void setLeaveStatus(row, "approved")}
                    className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-emerald-600 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {row.request.status !== "rejected" && (
                  <button
                    type="button"
                    aria-label={`Reject leave for ${row.employeeName}`}
                    disabled={saving}
                    onClick={() => void setLeaveStatus(row, "rejected")}
                    className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand disabled:opacity-40"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : null
          }
        />
      )}

      {tab === "payroll" &&
        (canManagePayroll ? (
          <DataTable<PayrollRun>
            columns={payrollColumns}
            rows={db.payrollRuns}
            searchFields={(run) => run.period}
            searchPlaceholder="Search period…"
            exportFilename="payroll-runs.csv"
            onRowClick={(run) => setViewingRun(run)}
            emptyTitle="No payroll runs"
            emptyDescription="Run payroll to generate payslips for the month."
            rowActions={(run) => (
              <div className="flex items-center justify-end gap-1">
                {run.status !== "paid" && (
                  <button
                    type="button"
                    aria-label={`Mark ${run.period} paid`}
                    disabled={saving}
                    onClick={() => void markRunPaid(run)}
                    className="rounded-lg border border-line px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-40"
                  >
                    Mark paid
                  </button>
                )}
              </div>
            )}
          />
        ) : (
          <AdminCard title="Restricted" description="Payroll">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
              <p className="text-sm text-muted">
                Payroll is restricted to HR, finance, admin and super admin roles. Your account does
                not have the <code className="text-ink">manage_payroll</code> capability.
              </p>
            </div>
          </AdminCard>
        ))}

      {tab === "recruitment" && (
        <DataTable<Applicant>
          columns={applicantColumns}
          rows={db.applicants}
          searchFields={(applicant) => `${applicant.name} ${applicant.role} ${applicant.email}`}
          searchPlaceholder="Search name, role or email…"
          exportFilename="applicants.csv"
          emptyTitle="No applicants"
          emptyDescription="Add applicants to track them through the hiring pipeline."
          toolbar={
            <Button size="sm" onClick={openNewApplicant}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add applicant
            </Button>
          }
          rowActions={(applicant) => (
            <div className="flex items-center justify-end gap-1">
              <SelectInput
                aria-label={`Stage for ${applicant.name}`}
                value={applicant.stage}
                disabled={saving}
                onChange={(event) =>
                  void setApplicantStage(applicant, event.target.value as Applicant["stage"])
                }
                className="w-28 px-2 py-1 text-xs"
              >
                {APPLICANT_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </SelectInput>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${applicant.name}`}
                  onClick={() =>
                    setConfirm({
                      title: "Delete applicant",
                      description: `This permanently removes ${applicant.name}.`,
                      run: () => void deleteApplicant(applicant),
                    })
                  }
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* -------- employee form -------- */}
      <SlideOver
        open={employeeOpen}
        onClose={() => setEmployeeOpen(false)}
        title={editingEmployeeId ? "Edit employee" : "Add employee"}
        description="Staff details, contract and pay."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEmployeeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveEmployee()} disabled={saving}>
              {saving ? "Saving…" : editingEmployeeId ? "Save changes" : "Add employee"}
            </Button>
          </>
        }
      >
        <Section title="Identity">
          <Field label="Staff no">
            <TextInput
              value={employeeForm.staffNo}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, staffNo: event.target.value }))
              }
            />
          </Field>
          <Field label="Name">
            <TextInput
              value={employeeForm.name}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={employeeForm.email}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, email: event.target.value }))
              }
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={employeeForm.phone}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, phone: event.target.value }))
              }
            />
          </Field>
        </Section>

        <Section title="Role">
          <Field label="Department">
            <SelectInput
              value={employeeForm.department}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, department: event.target.value }))
              }
            >
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Job title">
            <TextInput
              value={employeeForm.jobTitle}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, jobTitle: event.target.value }))
              }
            />
          </Field>
          <Field label="Contract">
            <SelectInput
              value={employeeForm.contract}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, contract: event.target.value }))
              }
            >
              {CONTRACTS.map((contract) => (
                <option key={contract} value={contract}>
                  {contract.replace(/_/g, " ")}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Start date">
            <TextInput
              type="date"
              value={employeeForm.startDate}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, startDate: event.target.value }))
              }
            />
          </Field>
        </Section>

        <Section title="Pay">
          <Field label="Gross monthly (GHS)">
            <TextInput
              type="number"
              min={0}
              value={employeeForm.grossMonthly}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, grossMonthly: event.target.value }))
              }
            />
          </Field>
          <Field label="Allowances (GHS)">
            <TextInput
              type="number"
              min={0}
              value={employeeForm.allowances}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, allowances: event.target.value }))
              }
            />
          </Field>
          <Field label="Emergency contact">
            <TextInput
              value={employeeForm.emergencyName}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, emergencyName: event.target.value }))
              }
            />
          </Field>
          <Field label="Emergency phone">
            <TextInput
              value={employeeForm.emergencyPhone}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, emergencyPhone: event.target.value }))
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              label="Active employee"
              checked={employeeForm.active}
              onChange={(event) =>
                setEmployeeForm((form) => ({ ...form, active: event.target.checked }))
              }
            />
          </div>
        </Section>
      </SlideOver>

      {/* -------- attendance form -------- */}
      <SlideOver
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        title="Record attendance"
        description="Log a shift for a team member."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAttendanceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveAttendance()} disabled={saving}>
              {saving ? "Saving…" : "Record"}
            </Button>
          </>
        }
      >
        <Section title="Shift">
          <Field label="Employee" className="sm:col-span-2">
            <SelectInput
              value={attendanceForm.employeeId}
              onChange={(event) =>
                setAttendanceForm((form) => ({ ...form, employeeId: event.target.value }))
              }
            >
              <option value="">Select employee</option>
              {db.employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} · {employee.staffNo}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date">
            <TextInput
              type="date"
              value={attendanceForm.date}
              onChange={(event) =>
                setAttendanceForm((form) => ({ ...form, date: event.target.value }))
              }
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={attendanceForm.status}
              onChange={(event) =>
                setAttendanceForm((form) => ({ ...form, status: event.target.value }))
              }
            >
              {ATTENDANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Clock in">
            <TextInput
              type="time"
              value={attendanceForm.clockIn}
              onChange={(event) => {
                const clockIn = event.target.value;
                setAttendanceForm((form) => {
                  const computed = hoursBetween(clockIn, form.clockOut);
                  return {
                    ...form,
                    clockIn,
                    hours: computed != null ? String(computed) : form.hours,
                  };
                });
              }}
            />
          </Field>
          <Field label="Clock out" hint="Leave empty if still on shift">
            <TextInput
              type="time"
              value={attendanceForm.clockOut}
              onChange={(event) => {
                const clockOut = event.target.value;
                setAttendanceForm((form) => {
                  const computed = hoursBetween(form.clockIn, clockOut);
                  return {
                    ...form,
                    clockOut,
                    hours: computed != null ? String(computed) : form.hours,
                  };
                });
              }}
            />
          </Field>
          <Field label="Hours" hint="Calculated from the times when both are set" className="sm:col-span-2">
            <TextInput
              type="number"
              min={0}
              step={0.1}
              value={attendanceForm.hours}
              onChange={(event) =>
                setAttendanceForm((form) => ({ ...form, hours: event.target.value }))
              }
            />
          </Field>
        </Section>
      </SlideOver>

      {/* -------- leave form -------- */}
      <SlideOver
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Request leave"
        description="Log a leave request for approval."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveLeave()} disabled={saving}>
              {saving ? "Saving…" : "Submit request"}
            </Button>
          </>
        }
      >
        <Section title="Leave">
          <Field label="Employee" className="sm:col-span-2">
            <SelectInput
              value={leaveForm.employeeId}
              onChange={(event) =>
                setLeaveForm((form) => ({ ...form, employeeId: event.target.value }))
              }
            >
              <option value="">Select employee</option>
              {db.employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} · {employee.staffNo}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Type">
            <SelectInput
              value={leaveForm.type}
              onChange={(event) =>
                setLeaveForm((form) => ({ ...form, type: event.target.value }))
              }
            >
              {LEAVE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Days">
            <TextInput
              type="number"
              min={1}
              value={leaveForm.days}
              onChange={(event) =>
                setLeaveForm((form) => ({ ...form, days: event.target.value }))
              }
            />
          </Field>
          <Field label="From">
            <TextInput
              type="date"
              value={leaveForm.from}
              onChange={(event) =>
                setLeaveForm((form) => {
                  const from = event.target.value;
                  return { ...form, from, days: daysBetween(from, form.to) || form.days };
                })
              }
            />
          </Field>
          <Field label="To">
            <TextInput
              type="date"
              value={leaveForm.to}
              onChange={(event) =>
                setLeaveForm((form) => {
                  const to = event.target.value;
                  return { ...form, to, days: daysBetween(form.from, to) || form.days };
                })
              }
            />
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <TextArea
              value={leaveForm.reason}
              placeholder="Why is this leave being taken?"
              onChange={(event) =>
                setLeaveForm((form) => ({ ...form, reason: event.target.value }))
              }
            />
          </Field>
        </Section>
      </SlideOver>

      {/* -------- applicant form -------- */}
      <SlideOver
        open={applicantOpen}
        onClose={() => setApplicantOpen(false)}
        title="Add applicant"
        description="Track a candidate through the hiring pipeline."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplicantOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveApplicant()} disabled={saving}>
              {saving ? "Saving…" : "Add applicant"}
            </Button>
          </>
        }
      >
        <Section title="Candidate">
          <Field label="Name" className="sm:col-span-2">
            <TextInput
              value={applicantForm.name}
              onChange={(event) =>
                setApplicantForm((form) => ({ ...form, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Role">
            <TextInput
              value={applicantForm.role}
              placeholder="e.g. Chauffeur"
              onChange={(event) =>
                setApplicantForm((form) => ({ ...form, role: event.target.value }))
              }
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={applicantForm.email}
              onChange={(event) =>
                setApplicantForm((form) => ({ ...form, email: event.target.value }))
              }
            />
          </Field>
          <Field label="Stage">
            <SelectInput
              value={applicantForm.stage}
              onChange={(event) =>
                setApplicantForm((form) => ({ ...form, stage: event.target.value }))
              }
            >
              {APPLICANT_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Applied">
            <TextInput
              type="date"
              value={applicantForm.appliedAt}
              onChange={(event) =>
                setApplicantForm((form) => ({ ...form, appliedAt: event.target.value }))
              }
            />
          </Field>
          <Field label="Rating" hint="1 – 5">
            <TextInput
              type="number"
              min={1}
              max={5}
              value={applicantForm.rating}
              onChange={(event) =>
                setApplicantForm((form) => ({ ...form, rating: event.target.value }))
              }
            />
          </Field>
        </Section>
      </SlideOver>

      {/* -------- run payroll -------- */}
      <SlideOver
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title="Run payroll"
        description="Generate payslips for every active employee."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRunOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void savePayroll()} disabled={saving}>
              {saving ? "Running…" : "Approve payroll"}
            </Button>
          </>
        }
      >
        <Field label="Period" hint="e.g. October 2026">
          <TextInput
            value={payrollPeriod}
            onChange={(event) => setPayrollPeriod(event.target.value)}
          />
        </Field>
        <div className="mt-5 rounded-2xl border border-line bg-mist p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Calculation · {activeEmployees.length} active employees
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted">Gross</dt>
              <dd className="font-medium text-ink">{formatGHS(payrollPreview.gross)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">SSNIT (5.5%)</dt>
              <dd className="text-ink">−{formatGHS(payrollPreview.ssnit)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">PAYE (12% of gross − SSNIT)</dt>
              <dd className="text-ink">−{formatGHS(payrollPreview.paye)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2">
              <dt className="font-medium text-ink">Net pay</dt>
              <dd className="font-semibold text-ink">{formatGHS(payrollPreview.net)}</dd>
            </div>
          </dl>
        </div>
      </SlideOver>

      {/* -------- payslip list -------- */}
      <SlideOver
        open={Boolean(viewingRun)}
        onClose={() => setViewingRun(null)}
        title={`Payslips · ${viewingRun?.period ?? ""}`}
        description={
          viewingRun
            ? `${viewingRun.employees} employees · ${formatGHS(viewingRun.net)} net`
            : undefined
        }
        width="lg"
      >
        {runPayslips.length === 0 ? (
          <p className="text-sm text-muted">No payslips were generated for this run.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead className="bg-mist">
                <tr>
                  {["Employee", "Basic", "Allowances", "SSNIT", "PAYE", "Net"].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {runPayslips.map((row) => (
                  <tr key={row.payslip.id}>
                    <td className="px-3 py-2.5 font-medium text-ink">{row.employeeName}</td>
                    <td className="px-3 py-2.5 text-ink">{formatGHS(row.payslip.basic)}</td>
                    <td className="px-3 py-2.5 text-ink">{formatGHS(row.payslip.allowances)}</td>
                    <td className="px-3 py-2.5 text-ink">{formatGHS(row.payslip.ssnit)}</td>
                    <td className="px-3 py-2.5 text-ink">{formatGHS(row.payslip.paye)}</td>
                    <td className="px-3 py-2.5 font-medium text-ink">{formatGHS(row.payslip.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel="Delete"
        onConfirm={() => confirm?.run()}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
