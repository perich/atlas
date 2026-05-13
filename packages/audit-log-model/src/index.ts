export type AuditLogModelStatus = {
  status: "scaffolded";
  packageName: "@bankops/audit-log-model";
};

export function createAuditLogModelStatus(): AuditLogModelStatus {
  return {
    status: "scaffolded",
    packageName: "@bankops/audit-log-model",
  };
}
