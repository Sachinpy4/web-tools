# 🔧 EasyPanel & Docker Infrastructure Troubleshooting Guide

## Quick Overview
Use this guide when your EasyPanel is inaccessible or your sites are down due to infrastructure issues.

---

## **Step 1: Initial System Diagnosis**
```bash
# Check Docker status
sudo systemctl status docker

# Check overall system resources
top -n 1 | head -10

# Check all running containers
docker ps -a

# Check available disk space
df -h
```

## **Step 2: Check EasyPanel Status**
```bash
# Find EasyPanel container
docker ps --filter "name=easypanel"

# Check EasyPanel logs (replace container ID)
docker logs EASYPANEL_CONTAINER_ID --tail 50

# Check if EasyPanel is listening on port 3000
netstat -tlnp | grep :3000
```

## **Step 3: Check Reverse Proxy (Traefik) Logs**
```bash
# Find Traefik container
docker ps --filter "name=traefik"

# Check recent logs for errors/spam
docker logs TRAEFIK_CONTAINER_ID --tail 100

# Check for authentication spam
docker logs TRAEFIK_CONTAINER_ID | grep "401" | tail -20
```

## **Step 4: Identify Problematic Containers**
```bash
# Check container resource usage
docker stats --no-stream

# Look for containers with high network I/O
docker logs CONTAINER_NAME --tail 50 | grep -E "(401|400|500|error)"

# Find containers making excessive requests
docker logs $(docker ps --filter "name=traefik" -q) | grep "POST.*auth.*401" | cut -d'"' -f6 | sort | uniq -c | sort -nr
```

## **Step 5: Stop Problematic Services**
```bash
# Stop specific project containers (e.g., layout project)
docker stop $(docker ps --filter "name=PROJECT_NAME" -q)

# Or stop a specific container
docker stop CONTAINER_ID

# Verify they're stopped
docker ps --filter "status=exited"
```

## **Step 6: Restart Core Services**
```bash
# Restart EasyPanel
docker restart EASYPANEL_CONTAINER_ID

# Restart Traefik (if needed)
docker restart TRAEFIK_CONTAINER_ID

# Restart Docker daemon (if needed)
sudo systemctl restart docker
```

## **Step 7: Verification**
```bash
# Check EasyPanel is accessible
curl -I http://YOUR_SERVER_IP:3000

# Check your main site
curl -I http://YOUR_DOMAIN.com

# Monitor logs for new issues
docker logs EASYPANEL_CONTAINER_ID --tail 10 -f

# Check system resources after fix
top -n 1 | head -5
```

## **Step 8: Quick Fix Commands (Copy-Paste Ready)**
```bash
# Complete emergency fix sequence
docker ps --filter "name=easypanel" && \
docker logs $(docker ps --filter "name=traefik" -q) --tail 50 | grep "401" && \
docker stop $(docker ps --filter "name=PROBLEMATIC_PROJECT" -q) && \
docker restart $(docker ps --filter "name=easypanel" -q) && \
echo "Fix applied - test EasyPanel access now"
```

## **Step 9: Preventive Monitoring**
```bash
# Check for auth loops (run periodically)
docker logs $(docker ps --filter "name=traefik" -q) --since="5m" | grep "401" | wc -l

# Monitor container resource usage
docker stats --no-stream | head -10

# Check system load
uptime
```

---

## 📋 **Quick Reference Card**

### **When site is down:**
1. `docker ps -a` ← Check all containers
2. `docker logs TRAEFIK_CONTAINER --tail 100` ← Check proxy logs  
3. `docker stats --no-stream` ← Check resources
4. `docker stop PROBLEMATIC_CONTAINER` ← Stop spam containers
5. `docker restart EASYPANEL_CONTAINER` ← Restart EasyPanel

### **Common Issues & Solutions:**

| Issue | Command | Solution |
|-------|---------|----------|
| EasyPanel not accessible | `docker restart $(docker ps --filter "name=easypanel" -q)` | Restart EasyPanel |
| Authentication spam | `docker stop $(docker ps --filter "name=PROJECT_NAME" -q)` | Stop problematic project |
| High resource usage | `docker stats --no-stream` | Identify heavy containers |
| DNS issues | `curl -I http://DOMAIN.com` | Test direct connectivity |

### **Replace these placeholders:**
- `EASYPANEL_CONTAINER_ID` → Your EasyPanel container ID
- `TRAEFIK_CONTAINER_ID` → Your Traefik container ID  
- `PROJECT_NAME` → Name of problematic project (like "layout")
- `YOUR_SERVER_IP` → Your server IP (e.g., 147.93.96.14)
- `YOUR_DOMAIN.com` → Your domain (e.g., toolscandy.com)
- `PROBLEMATIC_PROJECT` → Name of project causing issues

---

## 🚨 **Emergency One-Liner Commands**

```bash
# Quick health check
docker ps && docker stats --no-stream | head -5

# Stop all containers except EasyPanel and Traefik
docker stop $(docker ps -q --filter "name=^(?!.*easypanel)(?!.*traefik).*")

# Restart everything
docker restart $(docker ps -q)

# Check authentication spam
docker logs $(docker ps --filter "name=traefik" -q) --since="1m" | grep "401" | wc -l
```

---

## 📝 **Notes**
- Save this file for future reference
- Test commands in non-production first
- Always check logs before stopping containers
- Monitor system resources after making changes
- Keep backups of working configurations

---

**Last Updated:** Generated during incident resolution  
**Tested On:** EasyPanel with Docker Swarm on Ubuntu/Debian
