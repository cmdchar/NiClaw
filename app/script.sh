PID=\$(pgrep -f 'dist-electron' | head -1); sudo cat /proc/\37552/environ | tr '\0' '\n' | grep CLAWX_API_TOKEN
