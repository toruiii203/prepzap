import os
import subprocess

src_dir = r"C:\Users\Migs\.agents\skills"
targets = [
    r"C:\Users\Migs\.gemini\antigravity\skills",
    r"C:\Users\Migs\.gemini\antigravity\global_skills",
    r"C:\Users\Migs\.gemini\skills",
    r"C:\Users\Migs\Desktop\prepzap\prepzap-clean\.agent\skills",
]

for t in targets:
    os.makedirs(t, exist_ok=True)

skills = [d for d in os.listdir(src_dir) if os.path.isdir(os.path.join(src_dir, d))]
print(f"Syncing {len(skills)} skills to {len(targets)} target directories...")

for s in skills:
    s_path = os.path.join(src_dir, s)
    for t in targets:
        dest_path = os.path.join(t, s)
        if not os.path.exists(dest_path):
            cmd = f'cmd /c mklink /J "{dest_path}" "{s_path}"'
            subprocess.run(cmd, shell=True, capture_output=True)

for t in targets:
    count = len(os.listdir(t))
    print(f"Target: {t} -> {count} skills linked!")
