const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const batPath = path.resolve(__dirname, 'silent_health_check.bat');
console.log('[INFO] Target batch script:', batPath);

if (!fs.existsSync(batPath)) {
  console.error('[ERROR] Batch script not found:', batPath);
  process.exit(1);
}

// PowerShell script with proper quoting
const psScript = `
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument '/c ""${batPath}""'
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM
Register-ScheduledTask -TaskName "Antigravity_Workspace_Health_Monitor" -Action $action -Trigger $trigger -Description "Antigravity Workspace Health Monitor Daily Patrol" -Force
`;

const b64 = Buffer.from(psScript, 'utf16le').toString('base64');

try {
  const result = execSync(`powershell -NoProfile -EncodedCommand ${b64}`, { encoding: 'utf8' });
  console.log('[SUCCESS] Task registered successfully:\n', result);
} catch (error) {
  console.error('[ERROR] Failed to register task:\n', error.message);
  if (error.stdout) console.log(error.stdout);
  if (error.stderr) console.error(error.stderr);
  process.exit(1);
}
