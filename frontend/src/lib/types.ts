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
}

export interface User {
  id: number;
  name: string;
  email: string;
  steam_id?: string;
  avatar?: string;
  role: 'admin' | 'user';
  server_limit: number;
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
  steam_id: string;
  player_name: string;
  group_name: string;
  flags: string;
  immunity: number;
  expires_at?: string;
}

export interface CvarPreset {
  id: number;
  name: string;
  game_mode: string;
  description: string;
  cvars_json: Record<string, string>;
  is_default: boolean;
}
