export interface Server {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  port: number;
  rcon_port: number;
  tv_port: number;
  default_map: string;
  game_type: number;
  game_mode: number;
  max_players: number;
  status: 'offline' | 'starting' | 'running' | 'stopping' | 'crashed';
  cpu_limit: number;
  memory_limit_mb: number;
  disk_limit_mb: number;
  has_css: boolean;
  has_metamod: boolean;
  node?: Node;
  owner?: User;
  created_at: string;
}

export interface NodeTelemetry {
  cpu_model?: string;
  cpu_cores?: number;
  cpu_usage_pct?: number;
  ram_used_mb?: number;
  ram_total_mb?: number;
  ram_usage_pct?: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  disk_usage_pct?: number;
  platform?: string;
  uptime_seconds?: number;
}

export interface Node {
  id: number;
  name: string;
  fqdn: string;
  ip_address: string;
  daemon_port: number;
  sftp_port: number;
  location: string;
  is_active: boolean;
  total_ram_mb: number;
  total_disk_gb: number;
  cpu_cores: number;
  servers_count?: number;
  telemetry?: NodeTelemetry;
}

export interface Permission {
  id: number;
  slug: string;
  name: string;
  module: string;
  description?: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_system: boolean;
  permissions?: Permission[];
  users_count?: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  steam_id?: string;
  avatar?: string;
  role: string;
  is_admin?: boolean;
  is_superadmin?: boolean;
  server_limit: number;
  servers_count?: number;
  is_banned?: boolean;
  roles?: Role[];
  permissions?: string[];
  created_at?: string;
}

export interface Plugin {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  author: string;
  version: string;
  download_url?: string;
  github_repo?: string;
  is_featured: boolean;
  install_count: number;
}

export interface WorkshopMap {
  id: number;
  workshop_id: number;
  title: string;
  map_name: string;
  preview_url: string;
  game_mode_tags: string[];
}

export interface Ban {
  id: number;
  server_id: number;
  steam_id: string;
  player_name: string;
  ban_type: string;
  reason: string;
  admin_name: string;
  duration_minutes: number;
  is_unbanned: boolean;
  created_at: string;
}

export interface AdminPrivilege {
  id: number;
  server_id: number;
  player_name: string;
  steam_id: string;
  immunity: number;
  flags: string;
  comment?: string;
}

export interface Backup {
  id: number;
  server_id: number;
  filename: string;
  size_bytes: number;
  is_successful: boolean;
  created_at: string;
}

export interface Schedule {
  id: number;
  server_id: number;
  name: string;
  cron_expression: string;
  action_type: 'restart' | 'command' | 'backup' | 'map_change';
  payload?: string;
  is_active: boolean;
  last_run_at?: string;
}

export interface CvarPreset {
  id: number;
  name: string;
  game_mode: string;
  description: string;
  cvars?: Record<string, any>;
  cvars_json: Record<string, any>;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  user?: User;
  action: string;
  description: string;
  ip_address?: string;
  created_at: string;
}
