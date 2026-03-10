interface TenantHeaderProps {
  totalTenants: number;
  occupiedTenants: number;
  vacantTenants: number;
  onAddTenant: () => void;
}

export default function TenantHeader({
  totalTenants,
  occupiedTenants,
  vacantTenants,
  onAddTenant,
}: TenantHeaderProps) {
  return (
    <div className="tenant-header">
      <div className="tenant-stats">
        <div className="stat-card">
          <div className="stat-label">Total Tenants</div>
          <div className="stat-value">{totalTenants}</div>
        </div>
        <div className="stat-card occupied">
          <div className="stat-label">Occupied Rooms</div>
          <div className="stat-value">{occupiedTenants}</div>
        </div>
        <div className="stat-card vacant">
          <div className="stat-label">Vacant Rooms</div>
          <div className="stat-value">{vacantTenants}</div>
        </div>
      </div>
      <button className="btn-primary btn-create" onClick={onAddTenant}>
        + Add New Tenant
      </button>
    </div>
  );
}
