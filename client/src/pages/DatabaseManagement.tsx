import { DatabaseImport } from "@/components/DatabaseImport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DatabaseManagement() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Database Management</h1>
        <p className="text-muted-foreground mt-2">
          Export and import database backups
        </p>
      </div>

      <DatabaseImport />
    </div>
  );
}