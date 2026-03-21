import threading
import time
from scapy.all import sniff, IP, TCP, UDP, ICMP, conf, get_if_list, get_if_addr
from app.ml.engine import ml_engine
from app.services.notifications import send_alert_notification
import logging
from datetime import datetime
import asyncio
from app.database import db

from bson import ObjectId

logger = logging.getLogger(__name__)

class CaptureService:
    def __init__(self):
        self.is_running = False
        self.thread = None
        self.stop_event = threading.Event()
        self.packet_count = 0
        self.interface = None
        self.loop = None
        self.current_session_id = None
        self.service_map = {
            80: "http", 443: "http", 21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp",
            53: "domain_u", 110: "pop_3", 143: "imap4", 3306: "mysql"
        }

    async def start_capture(self, interface="eth0", bpf_filter: str | None = None, user_id: str | None = None):
        if self.is_running:
            return {"status": "Already running"}
        
        self.current_user_id = user_id
        # Get user email if user_id is provided
        self.current_user_email = None
        if user_id:
            try:
                user = await db.users.find_one({"_id": ObjectId(user_id)})
                if user:
                    self.current_user_email = user.get("email")
                    logger.info(f"Capture Session User Email: {self.current_user_email}")
                else:
                    logger.warning(f"Capture Session: User ID {user_id} not found in DB")
            except Exception as e:
                logger.error(f"Failed to fetch user email for capture session: {e}")
        else:
            logger.warning("Capture Session started without User ID")
        
        # Create session
        self.current_session_id = str(ObjectId())
        session_doc = {
            "_id": ObjectId(self.current_session_id),
            "type": "live_capture",
            "start_time": datetime.utcnow(),
            "name": f"Live Capture {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}",
            "status": "active",
            "interface": interface,
            "user_id": user_id
        }
        await db.sessions.insert_one(session_doc)
        
        self.is_running = True
        self.stop_event.clear()
        # select interface
        if interface in (None, "", "auto"):
            self.interface = self.get_default_interface()
        else:
            self.interface = interface
        # set filter
        self.bpf_filter = bpf_filter
        self.packet_count = 0
        try:
            self.loop = asyncio.get_event_loop()
        except RuntimeError:
            self.loop = None
        
        self.thread = threading.Thread(target=self._capture_loop)
        self.thread.daemon = True
        self.thread.start()
        
        return {"status": "Started", "interface": str(self.interface) if self.interface is not None else None, "session_id": self.current_session_id}

    async def stop_capture(self):
        if not self.is_running:
            return {"status": "Not running"}
        
        self.is_running = False
        self.stop_event.set()
        if self.thread:
            self.thread.join(timeout=2)
            
        # Update session
        if self.current_session_id:
            await db.sessions.update_one(
                {"_id": ObjectId(self.current_session_id)},
                {"$set": {
                    "end_time": datetime.utcnow(),
                    "status": "completed",
                    "packet_count": self.packet_count
                }}
            )
            self.current_session_id = None
        
        return {"status": "Stopped", "packets_captured": self.packet_count}

    def get_status(self, user_id: str | None = None):
        return {
            "is_running": self.is_running,
            "is_owner": self.current_user_id == user_id if self.is_running else True,
            "packets_captured": self.packet_count,
            "interface": self.interface
        }
    
    def list_interfaces(self):
        """
        Return a list of available interfaces with stable IDs and human-friendly names.
        IDs are suitable for sniff(iface=ID). Excludes loopback.
        """
        try:
            res = []
            try:
                # Prefer detailed listing on Windows
                from scapy.arch.windows import get_windows_if_list  # type: ignore
                win_list = get_windows_if_list()
                for itf in win_list:
                    guid = itf.get("guid")
                    name = itf.get("name")
                    desc = itf.get("description")
                    addr = itf.get("ip") # Note: scapy might put list in 'ips' but 'ip' might be single string
                    # Check both 'ip' and 'ips'
                    ips = itf.get("ips", [])
                    if addr:
                        ips.append(addr)
                    
                    # Check for loopback
                    if any(str(ip).startswith("127.") for ip in ips):
                        continue
                        
                    # Construct NPF ID
                    if guid:
                        npf_id = f"\\Device\\NPF_{guid}"
                    else:
                        npf_id = name

                    if npf_id:
                        # Exclude non-capturable adapters based on description
                        dlow = str(desc or name).lower()
                        if any(x in dlow for x in ("loopback", "miniport", "bluetooth", "hyper-v", "kernel debug", "isatap", "teredo", "virtual adapter", "pseudo-interface")):
                             # Keep "VirtualBox" if useful, but user didn't ask. 
                             # The user's list has many "Virtual Adapter" which are noise.
                             # But keep main interfaces.
                             pass
                        
                        # Better filter: If it has an IP, it's likely good.
                        # If no IP, it might be disconnected or passive.
                        
                        # User wants Wi-Fi or Ethernet.
                        # My script showed "Microsoft Wi-Fi Direct Virtual Adapter" which are noise usually.
                        if "virtual adapter" in dlow and not ips:
                             continue

                        display_name = name if name else desc
                        res.append({"id": str(npf_id), "name": str(display_name)})
            except Exception:
                # Cross-platform fallback
                for iface in get_if_list():
                    try:
                        addr = get_if_addr(iface)
                    except Exception:
                        addr = None
                    if addr and addr.startswith("127."):
                        continue
                    res.append({"id": str(iface), "name": str(iface)})
            try:
                import platform
                if platform.system() == "Windows":
                    # We constructed NPF IDs, so they should be valid.
                    # Just ensure uniqueness
                    seen = set()
                    unique_res = []
                    for r in res:
                        if r["id"] not in seen:
                            seen.add(r["id"])
                            unique_res.append(r)
                    res = unique_res
            except Exception:
                pass
            # Final sanitize to ensure JSON serializable strings only
            res = [{"id": str(r.get("id")), "name": str(r.get("name"))} for r in res if isinstance(r, dict) and r.get("id") is not None and r.get("name") is not None]
            if not res and conf.iface:
                return [{"id": str(conf.iface), "name": str(conf.iface)}]
            return res
        except Exception:
            return [{"id": str(conf.iface), "name": str(conf.iface)}] if conf.iface else []
    
    def get_default_interface(self):
        """
        Choose a non-loopback interface. Prefer Wi-Fi/Ethernet when available.
        Returns the sniff-compatible interface ID.
        """
        try:
            try:
                from scapy.arch.windows import get_windows_if_list  # type: ignore
                # Filter for connected interfaces (has IP)
                all_list = get_windows_if_list()
                win_list = []
                for itf in all_list:
                     ips = itf.get("ips", [])
                     if itf.get("ip"):
                         ips.append(itf.get("ip"))
                     if ips and not any(str(ip).startswith("127.") for ip in ips):
                         win_list.append(itf)
                         
                if win_list:
                    # Prefer Wi-Fi then Ethernet
                    for pref in ("Wi-Fi", "WiFi", "Wireless", "WLAN", "Ethernet", "Local Area Connection"):
                        for itf in win_list:
                            name = str(itf.get("name") or "")
                            desc = str(itf.get("description") or "").lower()
                            if pref.lower() in desc or pref.lower() in name.lower():
                                # Return constructed ID
                                if itf.get("guid"):
                                    return f"\\Device\\NPF_{itf.get('guid')}"
                                return itf.get("name")
                    # Fallback to first connected
                    itf = win_list[0]
                    if itf.get("guid"):
                        return f"\\Device\\NPF_{itf.get('guid')}"
                    return itf.get("name")
            except Exception:
                pass
            # Cross-platform fallback
            candidates = []
            for iface in get_if_list():
                try:
                    addr = get_if_addr(iface)
                except Exception:
                    addr = None
                if addr and addr != "127.0.0.1":
                    candidates.append(iface)
            if candidates:
                # Prefer NPF device names if present (Windows)
                for iface in candidates:
                    if "\\Device\\NPF_" in iface:
                        return iface
                return candidates[0]
        except Exception:
            pass
        return conf.iface

    def _extract_features(self, packet):
        """
        Extract features from Scapy packet for ML model.
        """
        features = {}
        
        # Defaults
        features['duration'] = 0
        features['protocol_type'] = 'tcp'
        features['service'] = 'private'
        features['flag'] = 'SF'
        features['src_bytes'] = 0
        features['dst_bytes'] = 0
        features['wrong_fragment'] = 0
        features['urgent'] = 0
        features['src_ip'] = None
        features['dst_ip'] = None
        features['port'] = None
        
        # Traffic stats (mocked for single packet context)
        features['count'] = 1
        features['srv_count'] = 1
        features['serror_rate'] = 0.0
        features['srv_serror_rate'] = 0.0
        features['same_srv_rate'] = 1.0
        features['diff_srv_rate'] = 0.0
        features['srv_diff_host_rate'] = 0.0
        features['dst_host_count'] = 1
        features['dst_host_srv_count'] = 1
        features['dst_host_same_srv_rate'] = 1.0
        features['dst_host_diff_srv_rate'] = 0.0
        
        if IP in packet:
            try:
                features['src_bytes'] = len(packet[IP].payload)
            except Exception:
                features['src_bytes'] = 0
            features['wrong_fragment'] = getattr(packet[IP], 'frag', 0)
            features['src_ip'] = getattr(packet[IP], 'src', None)
            features['dst_ip'] = getattr(packet[IP], 'dst', None)
            
            if TCP in packet:
                features['protocol_type'] = 'tcp'
                features['service'] = self.service_map.get(packet[TCP].dport, "private")
                features['urgent'] = getattr(packet[TCP], 'urgptr', 0) or 0
                features['port'] = getattr(packet[TCP], 'dport', None)
                # Simple flag mapping
                flags_str = str(getattr(packet[TCP], 'flags', ''))
                if 'R' in flags_str:
                    features['flag'] = 'REJ'
                elif 'S' in flags_str:
                    features['flag'] = 'S0'  # Connection attempt
                else:
                    features['flag'] = 'SF'  # Established/Normal
                
            elif UDP in packet:
                features['protocol_type'] = 'udp'
                features['service'] = self.service_map.get(packet[UDP].dport, "private")
                features['port'] = getattr(packet[UDP], 'dport', None)
                
            elif ICMP in packet:
                features['protocol_type'] = 'icmp'
                features['service'] = 'ecr_i'
                features['port'] = None
                
        return features

    def _capture_loop(self):
        logger.info(f"Starting capture on {self.interface}")
        # Ensure promiscuous mode when supported
        try:
            conf.sniff_promisc = True
        except Exception:
            pass
        
        def process_packet(packet):
            if self.stop_event.is_set():
                return False
            
            try:
                # Extract features only for real packets
                if not packet:
                    return
                features = self._extract_features(packet)

                # Filter out packets without source or destination IP
                if not features.get('src_ip') or not features.get('dst_ip'):
                    return

                self.packet_count += 1

                # Predict
                result = ml_engine.predict(features)
                try:
                    async def _persist():
                        log_entry = {
                            "features": features,
                            "prediction": {
                                **result,
                                "timestamp": datetime.utcnow().isoformat()
                            },
                            "user_id": self.current_user_id,
                            "timestamp": datetime.utcnow(),
                            "source": "live_capture",
                            "interface": self.interface,
                            "session_id": self.current_session_id
                        }
                        # Save to main logs collection
                        await db.logs.insert_one(log_entry)
                        # Save to session-specific collection if session exists
                        if self.current_session_id:
                            await db[f"logs_{self.current_session_id}"].insert_one(log_entry)

                        if result.get("severity") in ["Medium", "High", "Critical"] or result.get("attack_type") in ["DoS", "Probe", "R2L", "U2R"]:
                            alert = {
                                "attack": result.get("attack_type"),
                                "severity": result.get("severity"),
                                "timestamp": datetime.utcnow(),
                                "status": "New",
                                "details": {
                                    "sourceIp": features.get("src_ip"),
                                    "destIp": features.get("dst_ip"),
                                    "protocol": features.get("protocol_type"),
                                    "port": features.get("port")
                                },
                                "features": features,
                                "user_id": self.current_user_id,
                                "source": f"Interface: {self.interface}",
                                "session_id": self.current_session_id
                            }
                            # Save to main alerts collection
                            alert_id = await db.alerts.insert_one(alert)
                            # Save to session-specific collection if session exists
                            if self.current_session_id:
                                await db[f"alerts_{self.current_session_id}"].insert_one(alert)
                            
                            # Send Notification
                            await send_alert_notification(alert, user_email=self.current_user_email)

                            # Auto-create incident for Critical alerts
                            if result.get("severity") == "Critical":
                                incident_data = {
                                    "title": f"Critical Alert: {result.get('attack_type')} Detected",
                                    "description": f"Automated incident created from critical alert. Attack type: {result.get('attack_type')}. Source IP: {features.get('src_ip')}, Target IP: {features.get('dst_ip')}",
                                    "severity": "Critical",
                                    "status": "Open",
                                    "created_at": datetime.utcnow(),
                                    "updated_at": datetime.utcnow(),
                                    "source_ip": features.get("src_ip"),
                                    "target_ip": features.get("dst_ip"),
                                    "user_id": self.current_user_id,
                                    "alert_id": str(alert_id.inserted_id),
                                    "assigned_to": None,
                                    "notes": [],
                                    "actions": [],
                                    "timeline": [{
                                        "event": "Incident Created",
                                        "timestamp": datetime.utcnow(),
                                        "details": "Automated creation from Critical alert"
                                    }]
                                }
                                await db.incidents.insert_one(incident_data)
                    if self.loop:
                        asyncio.run_coroutine_threadsafe(_persist(), self.loop)
                    else:
                        asyncio.run(_persist())
                except Exception as e:
                    logger.error(f"Persist error: {e}")
                    
            except Exception as e:
                logger.error(f"Error processing packet: {e}")

        try:
            # Attempt to sniff
            # Note: store=0 avoids keeping packets in memory
            # count=0 means infinity, but we use a loop to check stop_event
            while not self.stop_event.is_set():
                # We use a short timeout sniff to allow checking stop_event
                # If sniff fails (e.g. no permission), fall back to mock
                try:
                    sniff(iface=self.interface, filter=self.bpf_filter, prn=process_packet, store=0, count=1, timeout=1)
                except Exception as e:
                    logger.warning(f"Sniffing failed (permissions?): {e}. Switching to simulation mode.")
                    time.sleep(1)
                    process_packet(None) # Simulate packet
                    
        except Exception as e:
            logger.error(f"Capture loop error: {e}")
            self.is_running = False

capture_service = CaptureService()
