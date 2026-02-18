'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileBarChart,
  Package,
  TrendingUp,
  Users,
  Warehouse,
  DollarSign,
  ClipboardList,
  ArrowRight,
  RefreshCw,
  Settings,
  History,
  Play,
  Loader2,
  Eye,
  Trash2,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { db } from '@/lib/firebase/client';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  getDocs,
  where,
  Timestamp
} from 'firebase/firestore';
import { toast } from '@/lib/toast';
import * as XLSX from 'xlsx';
import { ReportConfig, ReportHistory, ERP_COLLECTIONS, DEPARTMENTS } from '@/types/erp-extended';
import { reportService } from '@/lib/services/erp-services';

// Report type definitions with icons and descriptions
const REPORT_TYPES = [
  {
    id: 'inventory_summary',
    name: 'Inventory Summary',
    description: 'Current stock levels, values, and status for all materials',
    icon: Package,
    color: 'blue',
    fields: ['Material Code', 'Name', 'Category', 'Current Stock', 'Min Stock', 'Unit', 'Status', 'Supplier']
  },
  {
    id: 'stock_movement',
    name: 'Stock Movement',
    description: 'Track all material movements (issues, purchases, transfers)',
    icon: TrendingUp,
    color: 'green',
    fields: ['Date', 'Material', 'Type', 'Quantity', 'From', 'To', 'Reference', 'User']
  },
  {
    id: 'consumption_report',
    name: 'Consumption Report',
    description: 'Material consumption by department, project, or time period',
    icon: FileBarChart,
    color: 'orange',
    fields: ['Material', 'Department', 'Project', 'Quantity Used', 'Date Range', 'Avg Daily Usage']
  },
  {
    id: 'purchase_history',
    name: 'Purchase History',
    description: 'Complete purchase records with supplier and cost details',
    icon: DollarSign,
    color: 'purple',
    fields: ['Date', 'Material', 'Supplier', 'Quantity', 'Unit Price', 'Total', 'Invoice', 'Status']
  },
  {
    id: 'supplier_performance',
    name: 'Supplier Performance',
    description: 'Supplier metrics including delivery times and quality scores',
    icon: Users,
    color: 'cyan',
    fields: ['Supplier', 'Total Orders', 'On-Time %', 'Quality Score', 'Avg Lead Time', 'Total Value']
  },
  {
    id: 'audit_report',
    name: 'Audit Report',
    description: 'Inventory audit results with variances and adjustments',
    icon: ClipboardList,
    color: 'red',
    fields: ['Audit Date', 'Material', 'System Count', 'Physical Count', 'Variance', 'Status', 'Notes']
  },
  {
    id: 'low_stock_alert',
    name: 'Low Stock Alert',
    description: 'Items below minimum stock levels requiring attention',
    icon: AlertCircle,
    color: 'yellow',
    fields: ['Material', 'Current Stock', 'Min Stock', 'Shortage', 'Last Purchase', 'Preferred Supplier']
  },
  {
    id: 'material_valuation',
    name: 'Material Valuation',
    description: 'Inventory value breakdown by category and location',
    icon: Warehouse,
    color: 'indigo',
    fields: ['Category', 'Material Count', 'Total Quantity', 'Unit Value', 'Total Value', '% of Total']
  },
  {
    id: 'department_usage',
    name: 'Department Usage',
    description: 'Material consumption patterns by department',
    icon: Users,
    color: 'pink',
    fields: ['Department', 'Materials Used', 'Total Quantity', 'Top Materials', 'Period', 'Trend']
  }
] as const;

// Color mapping for report types
const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' }
};

// Report Type Card Component
function ReportTypeCard({ 
  report, 
  isSelected, 
  onClick 
}: { 
  report: typeof REPORT_TYPES[number];
  isSelected: boolean;
  onClick: () => void;
}) {
  const colors = colorClasses[report.color];
  const Icon = report.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 ${
        isSelected 
          ? `${colors.border} ${colors.bg} ring-2 ring-offset-2 ring-offset-zinc-950 ring-${report.color}-500/50` 
          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white text-sm">{report.name}</h3>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{report.description}</p>
        </div>
        {isSelected && (
          <CheckCircle2 className={`w-5 h-5 ${colors.text} flex-shrink-0`} />
        )}
      </div>
    </motion.div>
  );
}

// History Card Component
function HistoryCard({ 
  report, 
  onDownload, 
  onDelete 
}: { 
  report: ReportHistory;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const reportType = REPORT_TYPES.find(r => r.id === report.reportType);
  const colors = reportType ? colorClasses[reportType.color] : colorClasses.blue;
  const Icon = reportType?.icon || FileText;

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${colors.bg}`}>
            <Icon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white text-sm">{report.fileName}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(report.generatedAt)}
              </span>
              <span>{formatFileSize(report.fileSize)}</span>
              <span className={`px-2 py-0.5 rounded-full ${
                report.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                report.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {report.status}
              </span>
            </div>
            {report.filters && Object.keys(report.filters).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(report.filters).map(([key, value]) => (
                  <span key={key} className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.status === 'completed' && report.downloadUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownload}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Generate Report Modal
function GenerateReportModal({
  isOpen,
  onClose,
  selectedType,
  onGenerate
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedType: typeof REPORT_TYPES[number] | null;
  onGenerate: (config: Partial<ReportConfig>) => void;
}) {
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const categories = ['Raw Material', 'Consumable', 'Tool', 'Safety Equipment', 'Spare Part'];

  if (!selectedType) return null;

  const colors = colorClasses[selectedType.color];
  const Icon = selectedType.icon;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate({
        reportType: selectedType.id as ReportConfig['reportType'],
        format,
        filters: {
          dateRange: {
            start: Timestamp.fromDate(new Date(dateRange.start)),
            end: Timestamp.fromDate(new Date(dateRange.end))
          },
          departments: selectedDepartments.length > 0 ? selectedDepartments : undefined,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined
        }
      });
      onClose();
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <Icon className={`w-5 h-5 ${colors.text}`} />
            </div>
            Generate {selectedType.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-3 block">Export Format</label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat('excel')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  format === 'excel'
                    ? 'border-green-500/50 bg-green-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${format === 'excel' ? 'text-green-400' : 'text-zinc-400'}`} />
                <div className={`font-medium ${format === 'excel' ? 'text-green-400' : 'text-zinc-300'}`}>Excel (.xlsx)</div>
                <p className="text-xs text-zinc-500 mt-1">Best for data analysis</p>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                  format === 'pdf'
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <FileText className={`w-8 h-8 mx-auto mb-2 ${format === 'pdf' ? 'text-red-400' : 'text-zinc-400'}`} />
                <div className={`font-medium ${format === 'pdf' ? 'text-red-400' : 'text-zinc-300'}`}>PDF</div>
                <p className="text-xs text-zinc-500 mt-1">Best for printing/sharing</p>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-3 block">Date Range</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-zinc-500 mb-1 block">From</label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="flex items-end pb-2">
                <ArrowRight className="w-5 h-5 text-zinc-500" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-500 mb-1 block">To</label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-3 block">
              Filter by Department <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartments(prev => 
                    prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
                  )}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedDepartments.includes(dept)
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-3 block">
              Filter by Category <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategories(prev => 
                    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                  )}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedCategories.includes(cat)
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Fields */}
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-3 block">Report Columns</label>
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
              <div className="flex flex-wrap gap-2">
                {selectedType.fields.map((field) => (
                  <span key={field} className="px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Export Reports Page
export default function ExportReportsPage() {
  const [selectedReportType, setSelectedReportType] = useState<typeof REPORT_TYPES[number] | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to report history
  useEffect(() => {
    const q = query(
      collection(db, ERP_COLLECTIONS.reportHistory),
      orderBy('generatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReportHistory[];
      setReportHistory(history);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Generate report with Excel export
  const handleGenerateReport = async (config: Partial<ReportConfig>) => {
    try {
      // Fetch data based on report type
      const reportType = config.reportType;
      let data: Record<string, unknown>[] = [];
      let fileName = '';

      const dateStr = new Date().toISOString().split('T')[0];

      switch (reportType) {
        case 'inventory_summary': {
          const snapshot = await getDocs(collection(db, 'materials'));
          data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              'Material Code': d.code || '',
              'Name': d.name || '',
              'Category': d.category || '',
              'Current Stock': d.currentStock || 0,
              'Min Stock': d.minStock || 0,
              'Unit': d.unit || '',
              'Status': (d.currentStock || 0) <= 0 ? 'Out of Stock' : 
                       (d.currentStock || 0) <= (d.minStock || 0) ? 'Low Stock' : 'In Stock',
              'Supplier': d.supplier || ''
            };
          });
          fileName = `Inventory_Summary_${dateStr}`;
          break;
        }

        case 'stock_movement': {
          // Get issues
          const issuesSnapshot = await getDocs(collection(db, 'issue_records'));
          const issues = issuesSnapshot.docs.map(doc => {
            const d = doc.data();
            return {
              'Date': d.date?.toDate?.()?.toLocaleDateString() || d.date || '',
              'Material': d.material || '',
              'Type': 'Issue',
              'Quantity': -(d.quantity || 0),
              'From': 'Store',
              'To': d.team || d.department || '',
              'Reference': d.project || '',
              'User': d.entered_by || ''
            };
          });

          // Get purchases
          const purchasesSnapshot = await getDocs(collection(db, 'purchase_entries'));
          const purchases = purchasesSnapshot.docs.map(doc => {
            const d = doc.data();
            return {
              'Date': d.date?.toDate?.()?.toLocaleDateString() || d.date || '',
              'Material': d.material || '',
              'Type': 'Purchase',
              'Quantity': d.quantity || 0,
              'From': d.supplier || '',
              'To': 'Store',
              'Reference': d.invoice_no || '',
              'User': d.entered_by || ''
            };
          });

          data = [...issues, ...purchases].sort((a, b) => 
            new Date(b.Date as string).getTime() - new Date(a.Date as string).getTime()
          );
          fileName = `Stock_Movement_${dateStr}`;
          break;
        }

        case 'consumption_report': {
          const snapshot = await getDocs(collection(db, 'issue_records'));
          const consumptionMap: Record<string, Record<string, unknown>> = {};
          
          snapshot.docs.forEach(doc => {
            const d = doc.data();
            const key = `${d.material}-${d.team || d.department}`;
            if (!consumptionMap[key]) {
              consumptionMap[key] = {
                'Material': d.material,
                'Department': d.team || d.department || 'Unknown',
                'Project': d.project || 'General',
                'Quantity Used': 0,
                'Records': 0
              };
            }
            consumptionMap[key]['Quantity Used'] = 
              (consumptionMap[key]['Quantity Used'] as number) + (d.quantity || 0);
            consumptionMap[key]['Records'] = 
              (consumptionMap[key]['Records'] as number) + 1;
          });

          data = Object.values(consumptionMap);
          fileName = `Consumption_Report_${dateStr}`;
          break;
        }

        case 'purchase_history': {
          const snapshot = await getDocs(collection(db, 'purchase_entries'));
          data = snapshot.docs.map(doc => {
            const d = doc.data();
            const qty = d.quantity || 0;
            const price = d.unit_price || 0;
            return {
              'Date': d.date?.toDate?.()?.toLocaleDateString() || d.date || '',
              'Material': d.material || '',
              'Supplier': d.supplier || '',
              'Quantity': qty,
              'Unit Price': price,
              'Total': qty * price,
              'Invoice': d.invoice_no || '',
              'Status': 'Completed'
            };
          });
          fileName = `Purchase_History_${dateStr}`;
          break;
        }

        case 'supplier_performance': {
          const purchasesSnapshot = await getDocs(collection(db, 'purchase_entries'));
          const supplierMap: Record<string, Record<string, unknown>> = {};

          purchasesSnapshot.docs.forEach(doc => {
            const d = doc.data();
            const supplier = d.supplier || 'Unknown';
            if (!supplierMap[supplier]) {
              supplierMap[supplier] = {
                'Supplier': supplier,
                'Total Orders': 0,
                'On-Time %': 95, // Placeholder
                'Quality Score': 4.5, // Placeholder
                'Avg Lead Time': '5 days', // Placeholder
                'Total Value': 0
              };
            }
            supplierMap[supplier]['Total Orders'] = 
              (supplierMap[supplier]['Total Orders'] as number) + 1;
            supplierMap[supplier]['Total Value'] = 
              (supplierMap[supplier]['Total Value'] as number) + 
              ((d.quantity || 0) * (d.unit_price || 0));
          });

          data = Object.values(supplierMap);
          fileName = `Supplier_Performance_${dateStr}`;
          break;
        }

        case 'low_stock_alert': {
          const snapshot = await getDocs(collection(db, 'materials'));
          data = snapshot.docs
            .map(doc => doc.data())
            .filter(d => (d.currentStock || 0) <= (d.minStock || 0))
            .map(d => ({
              'Material': d.name || '',
              'Code': d.code || '',
              'Current Stock': d.currentStock || 0,
              'Min Stock': d.minStock || 0,
              'Shortage': Math.max(0, (d.minStock || 0) - (d.currentStock || 0)),
              'Unit': d.unit || '',
              'Preferred Supplier': d.supplier || ''
            }));
          fileName = `Low_Stock_Alert_${dateStr}`;
          break;
        }

        case 'material_valuation': {
          const snapshot = await getDocs(collection(db, 'materials'));
          const categoryMap: Record<string, Record<string, unknown>> = {};
          let totalValue = 0;

          snapshot.docs.forEach(doc => {
            const d = doc.data();
            const category = d.category || 'Uncategorized';
            const value = (d.currentStock || 0) * (d.unitPrice || 0);
            totalValue += value;

            if (!categoryMap[category]) {
              categoryMap[category] = {
                'Category': category,
                'Material Count': 0,
                'Total Quantity': 0,
                'Total Value': 0
              };
            }
            categoryMap[category]['Material Count'] = 
              (categoryMap[category]['Material Count'] as number) + 1;
            categoryMap[category]['Total Quantity'] = 
              (categoryMap[category]['Total Quantity'] as number) + (d.currentStock || 0);
            categoryMap[category]['Total Value'] = 
              (categoryMap[category]['Total Value'] as number) + value;
          });

          data = Object.values(categoryMap).map(item => ({
            ...item,
            '% of Total': totalValue > 0 
              ? ((item['Total Value'] as number / totalValue) * 100).toFixed(1) + '%' 
              : '0%'
          }));
          fileName = `Material_Valuation_${dateStr}`;
          break;
        }

        case 'department_usage': {
          const snapshot = await getDocs(collection(db, 'issue_records'));
          const deptMap: Record<string, Record<string, unknown>> = {};

          snapshot.docs.forEach(doc => {
            const d = doc.data();
            const dept = d.team || d.department || 'Unknown';
            if (!deptMap[dept]) {
              deptMap[dept] = {
                'Department': dept,
                'Total Issues': 0,
                'Total Quantity': 0,
                'Materials': new Set()
              };
            }
            deptMap[dept]['Total Issues'] = 
              (deptMap[dept]['Total Issues'] as number) + 1;
            deptMap[dept]['Total Quantity'] = 
              (deptMap[dept]['Total Quantity'] as number) + (d.quantity || 0);
            (deptMap[dept]['Materials'] as Set<string>).add(d.material || '');
          });

          data = Object.values(deptMap).map(item => ({
            'Department': item['Department'],
            'Total Issues': item['Total Issues'],
            'Total Quantity': item['Total Quantity'],
            'Unique Materials': (item['Materials'] as Set<string>).size
          }));
          fileName = `Department_Usage_${dateStr}`;
          break;
        }

        default:
          throw new Error('Unknown report type');
      }

      if (data.length === 0) {
        toast.error('No data found for the selected report');
        return;
      }

      // Generate Excel file
      if (config.format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

        // Auto-size columns
        const maxWidth = 20;
        const colWidths = Object.keys(data[0] || {}).map(key => ({
          wch: Math.min(maxWidth, Math.max(key.length, 10))
        }));
        worksheet['!cols'] = colWidths;

        // Download
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
        toast.success(`Report "${fileName}.xlsx" downloaded successfully!`);
      } else {
        // For PDF, we'll create a simple HTML table and print
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const headers = Object.keys(data[0] || {});
          const tableRows = data.map(row => 
            `<tr>${headers.map(h => `<td style="border:1px solid #ddd;padding:8px;">${row[h]}</td>`).join('')}</tr>`
          ).join('');

          printWindow.document.write(`
            <html>
              <head>
                <title>${fileName}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  h1 { color: #333; }
                  table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                  th { background-color: #4F46E5; color: white; padding: 10px; text-align: left; }
                  td { padding: 8px; border: 1px solid #ddd; }
                  tr:nth-child(even) { background-color: #f9f9f9; }
                  .footer { margin-top: 20px; color: #666; font-size: 12px; }
                </style>
              </head>
              <body>
                <h1>${selectedReportType?.name || 'Report'}</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <table>
                  <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                  </thead>
                  <tbody>
                    ${tableRows}
                  </tbody>
                </table>
                <div class="footer">
                  <p>Total Records: ${data.length}</p>
                  <p>Composite ERP - Triovision</p>
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
          toast.success('PDF report opened for printing');
        }
      }

      // Save to history
      await addDoc(collection(db, ERP_COLLECTIONS.reportHistory), {
        reportType: config.reportType,
        fileName: `${fileName}.${config.format === 'excel' ? 'xlsx' : 'pdf'}`,
        format: config.format,
        filters: config.filters || {},
        generatedBy: 'current-user',
        generatedAt: Timestamp.now(),
        status: 'completed',
        fileSize: data.length * 100, // Approximate
        recordCount: data.length
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  // Delete report from history
  const handleDeleteHistory = async (reportId: string) => {
    try {
      await deleteDoc(doc(db, ERP_COLLECTIONS.reportHistory, reportId));
      toast.success('Report removed from history');
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  // Stats calculations
  const stats = {
    totalReports: reportHistory.length,
    thisMonth: reportHistory.filter(r => {
      const date = r.generatedAt?.toDate();
      const now = new Date();
      return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    excelCount: reportHistory.filter(r => r.format === 'excel').length,
    pdfCount: reportHistory.filter(r => r.format === 'pdf').length
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Export Reports
        </h1>
        <p className="text-zinc-400 mt-2">Generate and download inventory reports in Excel or PDF format</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">Total Reports</p>
                  <p className="text-2xl font-bold text-white">{stats.totalReports}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <FileBarChart className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">This Month</p>
                  <p className="text-2xl font-bold text-white">{stats.thisMonth}</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <Calendar className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">Excel Reports</p>
                  <p className="text-2xl font-bold text-white">{stats.excelCount}</p>
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">PDF Reports</p>
                  <p className="text-2xl font-bold text-white">{stats.pdfCount}</p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <FileText className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1">
          <TabsTrigger 
            value="generate" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Report
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            <History className="w-4 h-4 mr-2" />
            Report History ({reportHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileBarChart className="w-5 h-5 text-blue-400" />
                Select Report Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {REPORT_TYPES.map((report) => (
                  <ReportTypeCard
                    key={report.id}
                    report={report}
                    isSelected={selectedReportType?.id === report.id}
                    onClick={() => setSelectedReportType(report)}
                  />
                ))}
              </div>

              {/* Action Button */}
              <div className="mt-6 flex justify-end">
                <Button
                  size="lg"
                  disabled={!selectedReportType}
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Configure & Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Generate */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-green-400" />
                Quick Generate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 text-sm mb-4">
                Generate common reports with default settings (last 30 days, all departments)
              </p>
              <div className="flex flex-wrap gap-3">
                {['inventory_summary', 'low_stock_alert', 'stock_movement', 'purchase_history'].map((typeId) => {
                  const report = REPORT_TYPES.find(r => r.id === typeId);
                  if (!report) return null;
                  const colors = colorClasses[report.color];
                  const Icon = report.icon;
                  
                  return (
                    <Button
                      key={typeId}
                      variant="outline"
                      onClick={() => {
                        setSelectedReportType(report);
                        handleGenerateReport({
                          reportType: typeId as ReportConfig['reportType'],
                          format: 'excel',
                          filters: {
                            dateRange: {
                              start: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
                              end: Timestamp.fromDate(new Date())
                            }
                          }
                        });
                      }}
                      className={`border-zinc-700 hover:${colors.bg} hover:${colors.border}`}
                    >
                      <Icon className={`w-4 h-4 mr-2 ${colors.text}`} />
                      {report.name}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : reportHistory.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-400">No reports generated yet</h3>
                <p className="text-sm text-zinc-500 mt-2">
                  Generate your first report to see it here
                </p>
                <Button 
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setActiveTab('generate')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reportHistory.map((report) => (
                <HistoryCard
                  key={report.id}
                  report={report}
                  onDownload={() => toast.info('Re-download feature coming soon')}
                  onDelete={() => handleDeleteHistory(report.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        selectedType={selectedReportType}
        onGenerate={handleGenerateReport}
      />
    </div>
  );
}
