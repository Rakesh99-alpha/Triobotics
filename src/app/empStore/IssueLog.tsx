import { IssueRecord } from '@/types/inventory';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface IssueLogProps {
  records: IssueRecord[];
}

const teamColors: Record<string, string> = {
  'Tooling': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Production': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Assembly': 'bg-green-500/20 text-green-400 border-green-500/30',
  'Quality': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'Maintenance': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'R&D': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

export function IssueLog({ records }: IssueLogProps) {
  return (
    <div className="glass rounded-xl overflow-hidden animate-slide-up">
      <div className="p-4 border-b border-border/50">
        <h3 className="text-lg font-semibold">Daily Issue Register</h3>
        <p className="text-sm text-muted-foreground mt-1">Material consumption log (read-only after submission)</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-semibold">Date & Time</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Team</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Project</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Material</TableHead>
            <TableHead className="text-muted-foreground font-semibold text-right">Qty Issued</TableHead>
            <TableHead className="text-muted-foreground font-semibold">Entered By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow
              key={record.id}
              className="border-border/30 transition-colors hover:bg-accent/30"
            >
              <TableCell className="text-muted-foreground">
                {format(record.date, 'dd MMM yyyy, HH:mm')}
              </TableCell>
              <TableCell>
                <Badge className={teamColors[record.team] || 'bg-muted text-muted-foreground'}>
                  {record.team}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{record.project}</TableCell>
              <TableCell>{record.materialName}</TableCell>
              <TableCell className="text-right font-semibold text-primary">
                {record.quantity}
              </TableCell>
              <TableCell className="text-muted-foreground">{record.enteredBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
